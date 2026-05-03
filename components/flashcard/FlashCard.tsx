'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle2, RefreshCw, Eye } from 'lucide-react'

interface Props {
  hanzi: string
  pinyin: string
  definition: string
  onKnown: () => void
  onAgain: () => void
}

export function FlashCard({ hanzi, pinyin, definition, onKnown, onAgain }: Props) {
  const [flipped, setFlipped] = useState(false)

  return (
    <div className="space-y-4">
      {/* Card */}
      <Card
        className="min-h-64 cursor-pointer select-none active:scale-[0.98] transition-transform"
        onClick={() => !flipped && setFlipped(true)}
      >
        <CardContent className="flex flex-col items-center justify-center h-64 gap-4 p-6 text-center">
          <p className="text-5xl font-bold tracking-wider">{hanzi}</p>

          {!flipped && (
            <div className="flex items-center gap-1.5 text-muted-foreground text-sm mt-2">
              <Eye className="h-4 w-4" />
              点击翻面查看答案
            </div>
          )}

          {flipped && (
            <div className="space-y-2 animate-in fade-in duration-200">
              <p className="text-base text-primary font-medium">{pinyin}</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{definition}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action buttons - only show after flip */}
      {flipped && (
        <div className="grid grid-cols-2 gap-3 animate-in slide-in-from-bottom-2 duration-200">
          <Button
            size="lg"
            variant="outline"
            className="h-14 border-orange-300 text-orange-600 hover:bg-orange-50"
            onClick={onAgain}
          >
            <RefreshCw className="h-4 w-4 mr-1.5" />
            再练练
          </Button>
          <Button
            size="lg"
            className="h-14 bg-green-500 hover:bg-green-600 text-white"
            onClick={onKnown}
          >
            <CheckCircle2 className="h-4 w-4 mr-1.5" />
            会了！
          </Button>
        </div>
      )}

      {!flipped && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-muted-foreground"
          onClick={() => setFlipped(true)}
        >
          <Eye className="h-4 w-4 mr-1.5" />
          查看答案
        </Button>
      )}
    </div>
  )
}
