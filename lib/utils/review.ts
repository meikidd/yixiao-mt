const REVIEW_INTERVALS_DAYS = [1, 3, 7, 15, 30]

export function getNextReviewDate(reviewCount: number): Date {
  const days = REVIEW_INTERVALS_DAYS[Math.min(reviewCount, REVIEW_INTERVALS_DAYS.length - 1)]
  const next = new Date()
  next.setDate(next.getDate() + days)
  return next
}

export function isDueForReview(nextReviewAt: string | null): boolean {
  if (!nextReviewAt) return true
  return new Date(nextReviewAt) <= new Date()
}

export function daysUntilReview(nextReviewAt: string | null): number {
  if (!nextReviewAt) return 0
  const diff = new Date(nextReviewAt).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}
