export const dynamic = 'force-dynamic'
import { getSupabaseServerClient, DEFAULT_USER_ID } from '@/lib/supabase/server'
import { ReviewSession } from '@/components/flashcard/ReviewSession'
import { Brain } from 'lucide-react'

export default async function ReviewPage() {
  const supabase = getSupabaseServerClient()

  const { data: dueWords } = await supabase
    .from('user_words')
    .select('*, words(*)')
    .eq('user_id', DEFAULT_USER_ID)
    .or(`next_review_at.is.null,next_review_at.lte.${new Date().toISOString()}`)
    .neq('status', 'mastered')
    .order('next_review_at', { ascending: true, nullsFirst: true })
    .limit(20)

  return (
    <div className="max-w-lg mx-auto p-4 md:p-6">
      <h1 className="text-xl font-bold mb-1">复习</h1>

      {!dueWords || dueWords.length === 0 ? (
        <div className="text-center py-20">
          <Brain className="h-14 w-14 mx-auto mb-4 text-green-500" />
          <p className="text-lg font-semibold text-green-700">太棒了！今天没有需要复习的词</p>
          <p className="text-sm text-muted-foreground mt-2">保持每天学习，明天再来吧！</p>
        </div>
      ) : (
        <ReviewSession initialWords={dueWords.map((uw) => ({
          userWordId: uw.id,
          wordId: uw.word_id,
          hanzi: (uw.words as { hanzi: string } | null)?.hanzi ?? '',
          pinyin: (uw.words as { pinyin: string } | null)?.pinyin ?? '',
          definition: (uw.words as { definition: string } | null)?.definition ?? '',
          status: uw.status,
          reviewCount: uw.review_count,
        }))} />
      )}
    </div>
  )
}
