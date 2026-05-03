import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient, DEFAULT_USER_ID } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = 20
  const offset = (page - 1) * limit

  const supabase = getSupabaseServerClient()

  const { data, error, count } = await supabase
    .from('articles')
    .select('*', { count: 'exact' })
    .eq('user_id', DEFAULT_USER_ID)
    .order('date_read', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ articles: data, total: count, page, limit })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const supabase = getSupabaseServerClient()

  const { data, error } = await supabase
    .from('articles')
    .insert({
      user_id: DEFAULT_USER_ID,
      title: body.title ?? null,
      content: body.content,
      source: body.source ?? 'manual',
      date_read: body.date_read ?? new Date().toISOString().split('T')[0],
      notes: body.notes ?? null,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
