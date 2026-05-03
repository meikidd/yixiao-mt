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

    // Check if already saved to user vocabulary (no auto-add)
    const { data: userWord } = await supabase
      .from('user_words')
      .select('id')
      .eq('user_id', DEFAULT_USER_ID)
      .eq('word_id', cached.id)
      .maybeSingle()

    const isSaved = !!userWord

    // Get existing relationships
    const { data: relationships } = await supabase
      .from('word_relationships')
      .select('*, word_b:words!word_relationships_word_b_id_fkey(id, hanzi)')
      .eq('word_a_id', cached.id)

    // Get user's learned words for display in related words section
    const { data: userWords } = await supabase
      .from('user_words')
      .select('words(hanzi)')
      .eq('user_id', DEFAULT_USER_ID)
      .limit(200)

    const learnedWords = (userWords ?? [])
      .map((uw) => (uw.words as unknown as { hanzi: string } | null)?.hanzi)
      .filter((w): w is string => !!w && w !== hanzi)

    return NextResponse.json({
      word: cached,
      relationships: relationships ?? [],
      learnedWords,
      isSaved,
    })
  } catch (err) {
    console.error('Lookup error:', err)
    return NextResponse.json({ error: '查询失败，请重试' }, { status: 500 })
  }
}
