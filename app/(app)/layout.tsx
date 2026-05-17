import { BottomNav } from '@/components/layout/BottomNav'
import { Sidebar } from '@/components/layout/Sidebar'
import { WordCardSheet } from '@/components/word-card/WordCardSheet'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-56 lg:w-64 md:flex-col md:fixed md:inset-y-0 md:border-r md:border-border md:bg-sidebar">
        <Sidebar displayName="一笑" gradeLabel="小学四年级" />
      </aside>

      {/* Main content */}
      <main className="flex-1 md:ml-56 lg:ml-64 pb-20 md:pb-0 min-h-screen">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background backdrop-blur-sm">
        <BottomNav />
      </nav>

      {/* Global word card sheet */}
      <WordCardSheet />
    </div>
  )
}
