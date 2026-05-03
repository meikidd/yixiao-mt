'use client'

import { useRouter } from 'next/navigation'
import { Search, X } from 'lucide-react'
import { useRef, useState } from 'react'

export function ArticleSearch({ defaultValue }: { defaultValue: string }) {
  const router = useRouter()
  const [value, setValue] = useState(defaultValue)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = value.trim()
    if (q) {
      router.push(`/articles?q=${encodeURIComponent(q)}`)
    } else {
      router.push('/articles')
    }
  }

  function handleClear() {
    setValue('')
    router.push('/articles')
    inputRef.current?.focus()
  }

  return (
    <form onSubmit={handleSubmit} className="relative mb-4">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="搜索文章内容…"
        className="w-full h-9 pl-9 pr-9 rounded-lg border bg-background text-sm outline-none focus:ring-2 focus:ring-ring"
      />
      {value && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </form>
  )
}
