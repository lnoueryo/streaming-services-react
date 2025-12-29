'use client'

import { SpaceResponse } from '@/repositories/space.repository'
import { createContext, useContext, ReactNode } from 'react'
import _useSpaceMember from '@/hooks/use-space-member'
type SpaceMemberContextValue = ReturnType<typeof _useSpaceMember>

const SpaceMemberContext = createContext<SpaceMemberContextValue | null>(null)

export function SpaceMemberProvider({
  initialSpace,
  children
}: {
  initialSpace: SpaceResponse
  children: ReactNode
}) {
  const spaceMember = _useSpaceMember(initialSpace)
  return (
    <SpaceMemberContext.Provider value={spaceMember}>
      {children}
    </SpaceMemberContext.Provider>
  )
}

export function useSpaceMember() {
  const ctx = useContext(SpaceMemberContext)
  if (!ctx)
    throw new Error('useSpaceMember must be used within SpaceMemberProvider')
  return ctx
}
