import { create } from 'zustand'

interface WordCardState {
  open: boolean
  hanzi: string
  context: string
  openWord: (hanzi: string, context?: string) => void
  close: () => void
}

export const useWordCardStore = create<WordCardState>((set) => ({
  open: false,
  hanzi: '',
  context: '',
  openWord: (hanzi, context = '') => set({ open: true, hanzi, context }),
  close: () => set({ open: false, hanzi: '', context: '' }),
}))
