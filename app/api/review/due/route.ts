import { NextResponse } from 'next/server'
import { getSupabaseServerClient, DEFAULT_USER_ID } from '@/lib/supabase/server'

export async function GET() {
  const supabase = getSupabaseServerClient()

  const { data, error } = await supabase
    .from('user_words')
    .select('*, words(*)')
    .eq('user_id', DEFAULT_USER_ID)
    .or(`next_review_at.is.null,next_review_at.lte.${new Date().toISOString()}`)
    .neq('status', 'mastered')
    .order('next_review_at', { ascending: true, nullsFirst: true })
    .limit(20)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ dueWords: data })
}
