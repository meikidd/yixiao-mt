import { BottomNav } from '@/components/layout/BottomNav'
import { Sidebar } from '@/components/layout/Sidebar'
import { WordCardSheet } from '@/components/word-card/WordCardSheet'
import { getSupabaseServerClient, DEFAULT_USER_ID } from '@/lib/supabase/server'

const GRADE_LABEL: Record<string, string> = {
  P1: '小学一年级', P2: '小学二年级', P3: '小学三年级',
  P4: '小学四年级', P5: '小学五年级', P6: '小学六年级',
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = getSupabaseServerClient()
  const { data: user } = await supabase
    .from('users')
    .select('display_name, grade')
    .eq('id', DEFAULT_USER_ID)
    .single()

  const displayName = (user as { display_name: string; grade: string | null } | null)?.display_name ?? 'Yixiao'
  const grade = (user as { display_name: string; grade: string | null } | null)?.grade
  const gradeLabel = grade ? (GRADE_LABEL[grade] ?? grade) : ''

  return (
    <div className="flex h-full min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-56 lg:w-64 md:flex-col md:fixed md:inset-y-0 md:border-r md:border-border md:bg-sidebar">
        <Sidebar displayName={displayName} gradeLabel={gradeLabel} />
      </aside>

      {/* Main content */}
      <main className="flex-1 md:ml-56 lg:ml-64 pb-20 md:pb-0 min-h-screen">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-sm">
        <BottomNav />
      </nav>

      {/* Global word card sheet */}
      <WordCardSheet />
    </div>
  )
}
