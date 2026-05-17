'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function DeleteArticleButton({ articleId }: { articleId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    if (!confirm('确定要删除这篇文章吗？删除后无法恢复。')) return
    setLoading(true)
    try {
      const res = await fetch(`/api/articles/${articleId}`, { method: 'DELETE' })
      if (res.ok) {
        router.push('/articles')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-destructive hover:text-destructive hover:bg-red-50"
      onClick={handleDelete}
      disabled={loading}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  )
}
