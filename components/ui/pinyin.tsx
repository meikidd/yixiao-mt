import { formatPinyin } from '@/lib/pinyin-utils'
import { cn } from '@/lib/utils'

interface Props {
  value: string | null | undefined
  className?: string
}

// lang="en" + explicit Latin font stack so diacritics like ō, á render correctly.
// font-sans on this project resolves to "Noto Sans SC" (CJK) which misrenders ō —
// hardcoding a Latin-only stack here bypasses that entirely.
const LATIN_FONTS = '-apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif'

export function Pinyin({ value, className }: Props) {
  if (!value) return null
  return (
    <span lang="en" style={{ fontFamily: LATIN_FONTS }} className={cn(className)}>
      {formatPinyin(value)}
    </span>
  )
}
