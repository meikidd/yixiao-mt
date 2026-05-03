import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient, DEFAULT_USER_ID } from '@/lib/supabase/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { status } = await request.json()

    const valid = ['new', 'learning', 'reviewing', 'mastered']
    if (!valid.includes(status)) {
      return NextResponse.json({ error: '无效的状态' }, { status: 400 })
    }

    const supabase = getSupabaseServerClient()
    const { error } = await supabase
      .from('user_words')
      .update({ status })
      .eq('id', id)
      .eq('user_id', DEFAULT_USER_ID)

    if (error) return NextResponse.json({ error: '更新失败' }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: '更新失败' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = getSupabaseServerClient()

    const { error } = await supabase
      .from('user_words')
      .delete()
      .eq('id', id)
      .eq('user_id', DEFAULT_USER_ID)

    if (error) return NextResponse.json({ error: '删除失败' }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: '删除失败' }, { status: 500 })
  }
}
