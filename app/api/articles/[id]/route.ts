import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient, DEFAULT_USER_ID } from '@/lib/supabase/server'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = getSupabaseServerClient()

    const { error } = await supabase
      .from('articles')
      .delete()
      .eq('id', id)
      .eq('user_id', DEFAULT_USER_ID)

    if (error) {
      return NextResponse.json({ error: '删除失败' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Article DELETE error:', err)
    return NextResponse.json({ error: '删除失败，请重试' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { content } = await request.json()
    if (typeof content !== 'string') {
      return NextResponse.json({ error: '未提供内容' }, { status: 400 })
    }

    const supabase = getSupabaseServerClient()

    const { error } = await supabase
      .from('articles')
      .update({ content })
      .eq('id', id)
      .eq('user_id', DEFAULT_USER_ID)

    if (error) {
      return NextResponse.json({ error: '保存失败' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Article PATCH error:', err)
    return NextResponse.json({ error: '保存失败，请重试' }, { status: 500 })
  }
}
