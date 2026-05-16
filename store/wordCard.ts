import { create } from 'zustand'

interface WordCardState {
  open: boolean
  hanzi: string
  context: string
  articleId: string | null
  savedWords: Set<string>
  sidebarMode: boolean
  openWord: (hanzi: string, context?: string, articleId?: string | null) => void
  close: () => void
  addSavedWord: (hanzi: string) => void
  setSidebarMode: (v: boolean) => void
}

export const useWordCardStore = create<WordCardState>((set) => ({
  open: false,
  hanzi: '',
  context: '',
  articleId: null,
  savedWords: new Set(),
  sidebarMode: false,
  openWord: (hanzi, context = '', articleId = null) =>
    set({ open: true, hanzi, context, articleId }),
  close: () => set({ open: false, hanzi: '', context: '', articleId: null }),
  addSavedWord: (hanzi) =>
    set((state) => ({ savedWords: new Set([...state.savedWords, hanzi]) })),
  setSidebarMode: (v) => set({ sidebarMode: v }),
}))
