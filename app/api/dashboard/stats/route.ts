import { NextResponse } from 'next/server'
import { getSupabaseServerClient, DEFAULT_USER_ID } from '@/lib/supabase/server'

export async function GET() {
  const supabase = getSupabaseServerClient()

  const [{ data: recentArticles }, { data: dueWords }, { data: allUserWords }] = await Promise.all([
    supabase
      .from('articles')
      .select('id, title, date_read, content')
      .eq('user_id', DEFAULT_USER_ID)
      .order('date_read', { ascending: false })
      .limit(3),
    supabase
      .from('user_words')
      .select('id')
      .eq('user_id', DEFAULT_USER_ID)
      .or(`next_review_at.is.null,next_review_at.lte.${new Date().toISOString()}`)
      .neq('status', 'mastered'),
    supabase
      .from('user_words')
      .select('id, status')
      .eq('user_id', DEFAULT_USER_ID),
  ])

  return NextResponse.json({
    recentArticles: recentArticles ?? [],
    dueCount: dueWords?.length ?? 0,
    totalWords: allUserWords?.length ?? 0,
    masteredWords: (allUserWords ?? []).filter((w) => w.status === 'mastered').length,
  })
}
