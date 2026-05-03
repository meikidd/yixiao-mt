import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient, DEFAULT_USER_ID } from '@/lib/supabase/server'
import { findRelatedWords } from '@/lib/claude/relate'

export async function POST(request: NextRequest) {
  try {
    const { wordId, hanzi, articleId, context } = await request.json()
    if (!wordId) {
      return NextResponse.json({ error: '未提供词语ID' }, { status: 400 })
    }

    const supabase = getSupabaseServerClient()

    // Save to user_words
    await supabase
      .from('user_words')
      .upsert({ user_id: DEFAULT_USER_ID, word_id: wordId, status: 'new' }, { onConflict: 'user_id,word_id' })

    // Link to article if provided
    if (articleId) {
      await supabase
        .from('article_words')
        .upsert({
          article_id: articleId,
          word_id: wordId,
          is_annotated: false,
          context_sentence: context ?? null,
        }, { onConflict: 'article_id,word_id' })
    }

    // Build knowledge relations in background
    if (hanzi) {
      buildRelationsAsync(supabase, hanzi, wordId).catch(console.error)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Save word error:', err)
    return NextResponse.json({ error: '保存失败，请重试' }, { status: 500 })
  }
}

async function buildRelationsAsync(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  hanzi: string,
  wordId: string
) {
  const { data: userWords } = await supabase
    .from('user_words')
    .select('words(hanzi)')
    .eq('user_id', DEFAULT_USER_ID)
    .limit(200)

  const learnedWords = (userWords ?? [])
    .map((uw) => (uw.words as unknown as { hanzi: string } | null)?.hanzi)
    .filter((w): w is string => !!w && w !== hanzi)

  if (learnedWords.length === 0) return

  const relations = await findRelatedWords(hanzi, learnedWords)
  for (const rel of relations) {
    const { data: wordB } = await supabase.from('words').select('id').eq('hanzi', rel.word).single()
    if (!wordB) continue

    await supabase.from('word_relationships').upsert({
      word_a_id: wordId, word_b_id: wordB.id,
      relation_type: rel.relation_type, explanation: rel.explanation, auto_generated: true,
    }, { onConflict: 'word_a_id,word_b_id,relation_type' })

    await supabase.from('word_relationships').upsert({
      word_a_id: wordB.id, word_b_id: wordId,
      relation_type: rel.relation_type, explanation: rel.explanation, auto_generated: true,
    }, { onConflict: 'word_a_id,word_b_id,relation_type' })
  }
}
