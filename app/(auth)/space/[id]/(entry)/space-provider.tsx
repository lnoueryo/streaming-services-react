'use client'

import { SpaceResponse } from '@/repositories/space.repository'
import { createContext, useContext, useState, ReactNode } from 'react'

type SpaceContextValue = {
  space: SpaceResponse
  setSpace: (space: SpaceResponse) => void
}

const SpaceContext = createContext<SpaceContextValue | null>(null)

export function SpaceProvider({
  initialSpace,
  children
}: {
  initialSpace: SpaceResponse
  children: ReactNode
}) {
  const [space, setSpace] = useState<SpaceResponse>(initialSpace)

  return (
    <SpaceContext.Provider value={{ space, setSpace }}>
      {children}
    </SpaceContext.Provider>
  )
}

export function useSpace() {
  const ctx = useContext(SpaceContext)
  if (!ctx) throw new Error('useSpace must be used within SpaceProvider')
  return ctx
}
