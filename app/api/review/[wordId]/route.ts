import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient, DEFAULT_USER_ID } from '@/lib/supabase/server'
import { getNextReviewDate } from '@/lib/utils/review'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ wordId: string }> }
) {
  const { wordId } = await params
  const { result } = await request.json() // 'known' | 'again'
  const supabase = getSupabaseServerClient()

  const { data: current } = await supabase
    .from('user_words')
    .select('review_count, status')
    .eq('user_id', DEFAULT_USER_ID)
    .eq('word_id', wordId)
    .single()

  if (!current) {
    return NextResponse.json({ error: '未找到该词' }, { status: 404 })
  }

  const newReviewCount = result === 'known' ? current.review_count + 1 : Math.max(0, current.review_count - 1)
  const newStatus = newReviewCount >= 5 ? 'mastered' : newReviewCount >= 3 ? 'reviewing' : 'learning'
  const nextReviewAt = result === 'known' ? getNextReviewDate(newReviewCount).toISOString() : getNextReviewDate(0).toISOString()

  const { error } = await supabase
    .from('user_words')
    .update({
      review_count: newReviewCount,
      status: newStatus,
      last_reviewed_at: new Date().toISOString(),
      next_review_at: nextReviewAt,
    })
    .eq('user_id', DEFAULT_USER_ID)
    .eq('word_id', wordId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ status: newStatus, nextReviewAt })
}
