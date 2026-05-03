import { create } from 'zustand'

type UploadStep = 'idle' | 'preprocessing' | 'uploading' | 'analyzing' | 'saving' | 'done' | 'error'

interface UploadState {
  step: UploadStep
  progress: number
  errorMessage: string | null
  previewUrl: string | null
  setStep: (step: UploadStep) => void
  setProgress: (progress: number) => void
  setError: (message: string) => void
  setPreviewUrl: (url: string | null) => void
  reset: () => void
}

export const useUploadStore = create<UploadState>((set) => ({
  step: 'idle',
  progress: 0,
  errorMessage: null,
  previewUrl: null,
  setStep: (step) => set({ step }),
  setProgress: (progress) => set({ progress }),
  setError: (errorMessage) => set({ step: 'error', errorMessage }),
  setPreviewUrl: (previewUrl) => set({ previewUrl }),
  reset: () => set({ step: 'idle', progress: 0, errorMessage: null, previewUrl: null }),
}))
