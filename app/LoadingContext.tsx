'use client' // 必須（Next.js App Router の場合）

import { createContext, useContext, useState } from 'react'
import FullScreenLoader from '@/components/atoms/FullScreenLoader'

type LoadingContextValue = {
  startLoading: () => void
  endLoading: () => void
}

const LoadingContext = createContext<LoadingContextValue>({
  startLoading: () => {},
  endLoading: () => {}
})

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false)

  const startLoading = () => setVisible(true)
  const endLoading = () => setVisible(false)

  return (
    <LoadingContext.Provider value={{ startLoading, endLoading }}>
      {visible && <FullScreenLoader />}
      {children}
    </LoadingContext.Provider>
  )
}

export function useLoading() {
  return useContext(LoadingContext)
}
