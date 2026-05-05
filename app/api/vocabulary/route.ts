import { NextResponse } from 'next/server'
import { getSupabaseServerClient, DEFAULT_USER_ID } from '@/lib/supabase/server'

export async function GET() {
  const supabase = getSupabaseServerClient()

  const { data: userWords, error } = await supabase
    .from('user_words')
    .select('*, words(*)')
    .eq('user_id', DEFAULT_USER_ID)
    .order('first_seen_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(userWords ?? [])
}
