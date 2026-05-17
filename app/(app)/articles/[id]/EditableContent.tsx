'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArticleText } from '@/components/article-viewer/ArticleText'
import { Pencil, Check, X, Loader2, AudioLines } from 'lucide-react'

interface Props {
  articleId: string
  content: string
  vocabWords: string[]
}

export function EditableContent({ articleId, content, vocabWords }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(content)
  const [saving, setSaving] = useState(false)
  const [pinyinMode, setPinyinMode] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch(`/api/articles/${articleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: draft }),
      })
      if (res.ok) {
        setEditing(false)
        router.refresh()
      }
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    setDraft(content)
    setEditing(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">正文</span>
        <div className="flex items-center gap-1">
          {!editing && (
            <Button
              size="sm"
              variant={pinyinMode ? 'secondary' : 'ghost'}
              onClick={() => setPinyinMode((v) => !v)}
              className="h-7 px-2 text-xs"
              title="拼音模式"
            >
              <AudioLines className="h-3 w-3 mr-1" />
              拼音
            </Button>
          )}
          {!editing ? (
            <Button size="sm" variant="ghost" onClick={() => setEditing(true)} className="h-7 px-2 text-xs">
              <Pencil className="h-3 w-3 mr-1" />
              编辑
            </Button>
          ) : (
            <>
              <Button size="sm" variant="ghost" onClick={handleCancel} className="h-7 px-2 text-xs" disabled={saving}>
                <X className="h-3 w-3 mr-1" />
                取消
              </Button>
              <Button size="sm" onClick={handleSave} className="h-7 px-2 text-xs" disabled={saving}>
                {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Check className="h-3 w-3 mr-1" />保存</>}
              </Button>
            </>
          )}
        </div>
      </div>

      {editing ? (
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="w-full min-h-[400px] text-base leading-8 font-inherit border rounded-lg p-3 resize-y focus:outline-none focus:ring-2 focus:ring-primary bg-background"
          autoFocus
        />
      ) : (
        <ArticleText content={content} vocabWords={vocabWords} articleId={articleId} pinyinMode={pinyinMode} />
      )}
    </div>
  )
}
