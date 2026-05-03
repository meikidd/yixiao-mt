import { create } from 'zustand'

interface WordCardState {
  open: boolean
  hanzi: string
  context: string
  articleId: string | null
  savedWords: Set<string>
  openWord: (hanzi: string, context?: string, articleId?: string | null) => void
  close: () => void
  addSavedWord: (hanzi: string) => void
}

export const useWordCardStore = create<WordCardState>((set) => ({
  open: false,
  hanzi: '',
  context: '',
  articleId: null,
  savedWords: new Set(),
  openWord: (hanzi, context = '', articleId = null) =>
    set({ open: true, hanzi, context, articleId }),
  close: () => set({ open: false, hanzi: '', context: '', articleId: null }),
  addSavedWord: (hanzi) =>
    set((state) => ({ savedWords: new Set([...state.savedWords, hanzi]) })),
}))
