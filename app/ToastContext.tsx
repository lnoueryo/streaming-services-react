'use client'

import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback
} from 'react'
import Toast, { ToastType } from '@/components/atoms/Toast'

type ToastState = {
  open: boolean
  message: string
  type: ToastType
}

type ToastContextType = {
  showToast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState>({
    open: false,
    message: '',
    type: 'info'
  })

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    setToast({ open: true, message, type })
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      <Toast
        open={toast.open}
        message={toast.message}
        type={toast.type}
        onClose={() =>
          setToast((t) => ({
            ...t,
            open: false
          }))
        }
      />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return ctx
}
