import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient, DEFAULT_USER_ID } from '@/lib/supabase/server'
import { lookupWord } from '@/lib/claude/lookup'

export async function POST(request: NextRequest) {
  try {
    const { hanzi, context } = await request.json()
    if (!hanzi) {
      return NextResponse.json({ error: '未提供字词' }, { status: 400 })
    }

    const supabase = getSupabaseServerClient()

    // Check word cache
    let { data: cached } = await supabase
      .from('words')
      .select('*')
      .eq('hanzi', hanzi)
      .single()

    if (!cached || !cached.definition) {
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

    // Check if already saved to user vocabulary
    const { data: userWord } = await supabase
      .from('user_words')
      .select('id')
      .eq('user_id', DEFAULT_USER_ID)
      .eq('word_id', cached.id)
      .maybeSingle()

    const isSaved = !!userWord

    // Get user's learned words
    const { data: userWords } = await supabase
      .from('user_words')
      .select('words(hanzi)')
      .eq('user_id', DEFAULT_USER_ID)
      .limit(200)

    const learnedWords = (userWords ?? [])
      .map((uw) => (uw.words as unknown as { hanzi: string } | null)?.hanzi)
      .filter((w): w is string => !!w && w !== hanzi)

    // Find same_char relationships: learned words that share any character with the queried word
    const hanziChars = new Set(Array.from(hanzi))
    const sameCharHanzi = learnedWords.filter((w) =>
      Array.from(w).some((c) => hanziChars.has(c))
    )

    let relationships: { relation_type: string; explanation: null; word_b: { id: string; hanzi: string } }[] = []

    if (sameCharHanzi.length > 0) {
      const { data: matchedWords } = await supabase
        .from('words')
        .select('id, hanzi')
        .in('hanzi', sameCharHanzi)

      relationships = (matchedWords ?? []).map((w) => ({
        relation_type: 'same_char' as const,
        explanation: null,
        word_b: { id: w.id, hanzi: w.hanzi },
      }))
    }

    // Find all articles whose content contains this word
    const { data: articlesWithWord } = await supabase
      .from('articles')
      .select('id, title, date_read, content')
      .ilike('content', `%${hanzi}%`)
      .limit(10)

    // Extract a short context snippet around the first occurrence
    const articleWords = (articlesWithWord ?? []).map((art) => {
      const idx = art.content.indexOf(hanzi)
      let contextSentence: string | null = null
      if (idx !== -1) {
        const start = Math.max(0, idx - 15)
        const end = Math.min(art.content.length, idx + hanzi.length + 15)
        contextSentence = art.content.slice(start, end).replace(/\n/g, ' ')
      }
      return {
        article_id: art.id,
        context_sentence: contextSentence,
        articles: { id: art.id, title: art.title, date_read: art.date_read, content: art.content },
      }
    })

    return NextResponse.json({
      word: cached,
      relationships,
      learnedWords,
      isSaved,
      articleWords,
    })
  } catch (err) {
    console.error('Lookup error:', err)
    return NextResponse.json({ error: '查询失败，请重试' }, { status: 500 })
  }
}
