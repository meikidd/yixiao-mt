'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, BookOpen, Camera, Library, Brain } from 'lucide-react'
import { cn } from '@/lib/utils'

const ICONS = { home: Home, 'book-open': BookOpen, camera: Camera, library: Library, brain: Brain }
const NAV_ITEMS = [
  { href: '/dashboard', label: '首页', icon: 'home' },
  { href: '/articles', label: '文章', icon: 'book-open' },
  { href: '/upload', label: '拍照录入', icon: 'camera' },
  { href: '/vocabulary', label: '词汇表', icon: 'library' },
  { href: '/review', label: '复习', icon: 'brain' },
] as const

interface Props {
  displayName: string
  gradeLabel: string
}

export function Sidebar({ displayName, gradeLabel }: Props) {
  const pathname = usePathname()

  return (
    <div className="flex flex-col h-full p-4">
      <div className="mb-8 px-2">
        <h1 className="text-lg font-bold text-foreground">{displayName}的华语学习</h1>
        {gradeLabel && <p className="text-xs text-muted-foreground">{gradeLabel}</p>}
      </div>

      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map(({ href, label, icon }) => {
          const Icon = ICONS[icon]
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
