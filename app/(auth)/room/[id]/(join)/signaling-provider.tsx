'use client'
import { createContext, useContext } from 'react'
import _useSignaling from '@/hooks/use-signaling'
type SignalingContextValue = ReturnType<typeof _useSignaling>

const SignalingContext = createContext<SignalingContextValue | null>(null)

export function useSignaling() {
  const ctx = useContext(SignalingContext)
  if (!ctx) {
    throw new Error('useSignaling must be used within SignalingProvider')
  }
  return ctx
}

export function SignalingProvider({
  url,
  children
}: {
  url: string
  children: React.ReactNode
}) {
  const signaling = _useSignaling(url)

  return (
    <SignalingContext.Provider value={signaling}>
      {children}
    </SignalingContext.Provider>
  )
}
