'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, BookOpen, Camera, Library, Brain } from 'lucide-react'
import { cn } from '@/lib/utils'

const ICONS = { home: Home, 'book-open': BookOpen, camera: Camera, library: Library, brain: Brain }
const NAV_ITEMS = [
  { href: '/dashboard', label: '首页', icon: 'home' },
  { href: '/articles', label: '文章', icon: 'book-open' },
  { href: '/upload', label: '拍照', icon: 'camera' },
  { href: '/vocabulary', label: '词汇', icon: 'library' },
  { href: '/review', label: '复习', icon: 'brain' },
] as const

export function BottomNav() {
  const pathname = usePathname()

  return (
    <div className="flex items-center justify-around h-16 px-2">
      {NAV_ITEMS.map(({ href, label, icon }) => {
        const Icon = ICONS[icon]
        const active = pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg transition-colors',
              active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className={cn('h-5 w-5', icon === 'camera' && 'h-6 w-6')} />
            <span className="text-[10px] font-medium">{label}</span>
          </Link>
        )
      })}
    </div>
  )
}
