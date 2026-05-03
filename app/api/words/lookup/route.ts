import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient, DEFAULT_USER_ID } from '@/lib/supabase/server'
import { lookupWord } from '@/lib/claude/lookup'
import { findRelatedWords } from '@/lib/claude/relate'

export async function POST(request: NextRequest) {
  try {
    const { hanzi, context, articleId } = await request.json()
    if (!hanzi) {
      return NextResponse.json({ error: '未提供字词' }, { status: 400 })
    }

    const supabase = getSupabaseServerClient()

    // Check cache first
    let { data: cached } = await supabase
      .from('words')
      .select('*')
      .eq('hanzi', hanzi)
      .single()

    if (!cached || !cached.definition) {
      // Call Claude API
      const result = await lookupWord(hanzi, context ?? '')

      const { data: upserted } = await supabase
        .from('words')
        .upsert({
          hanzi,
          pinyin: result.pinyin,
          part_of_speech: result.part_of_speech,
          definition: result.definition,
          example_sentences: result.example_sentences,
          usage_notes: result.usage_notes,
        }, { onConflict: 'hanzi' })
        .select()
        .single()

      cached = upserted
    }

    if (!cached) {
      return NextResponse.json({ error: '查询失败' }, { status: 500 })
    }

    // Add to user_words if not already there
    await supabase
      .from('user_words')
      .upsert({ user_id: DEFAULT_USER_ID, word_id: cached.id, status: 'new' }, { onConflict: 'user_id,word_id' })

    // Link to article if provided
    if (articleId) {
      await supabase
        .from('article_words')
        .upsert({
          article_id: articleId,
          word_id: cached.id,
          context_sentence: context ?? null,
        }, { onConflict: 'article_id,word_id' })
    }

    // Get existing relationships
    const { data: relationships } = await supabase
      .from('word_relationships')
      .select('*, word_b:words!word_relationships_word_b_id_fkey(id, hanzi)')
      .eq('word_a_id', cached.id)

    // Get user's learned words for async relation building
    const { data: userWords } = await supabase
      .from('user_words')
      .select('words(hanzi)')
      .eq('user_id', DEFAULT_USER_ID)
      .limit(200)

    const learnedWords = (userWords ?? [])
      .map((uw) => (uw.words as unknown as { hanzi: string } | null)?.hanzi)
      .filter((w): w is string => !!w && w !== hanzi)

    // Build new relations in background
    if (learnedWords.length > 0 && (!relationships || relationships.length === 0)) {
      findRelatedWords(hanzi, learnedWords).then(async (relations) => {
        for (const rel of relations) {
          const { data: wordB } = await supabase
            .from('words')
            .select('id')
            .eq('hanzi', rel.word)
            .single()
          if (!wordB) return

          await supabase.from('word_relationships').upsert({
            word_a_id: cached!.id,
            word_b_id: wordB.id,
            relation_type: rel.relation_type,
            explanation: rel.explanation,
            auto_generated: true,
          }, { onConflict: 'word_a_id,word_b_id,relation_type' })

          await supabase.from('word_relationships').upsert({
            word_a_id: wordB.id,
            word_b_id: cached!.id,
            relation_type: rel.relation_type,
            explanation: rel.explanation,
            auto_generated: true,
          }, { onConflict: 'word_a_id,word_b_id,relation_type' })
        }
      }).catch(console.error)
    }

    return NextResponse.json({
      word: cached,
      relationships: relationships ?? [],
      learnedWords,
    })
  } catch (err) {
    console.error('Lookup error:', err)
    return NextResponse.json({ error: '查询失败，请重试' }, { status: 500 })
  }
}
