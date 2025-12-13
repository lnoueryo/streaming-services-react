'use client'

import { createContext, useContext } from 'react'

export interface DecodedUser {
  uid: string
  email: string
  name?: string
}

const UserContext = createContext<DecodedUser | null>(null)

export function UserProvider({
  user,
  children
}: {
  user: DecodedUser | null
  children: React.ReactNode
}) {
  return <UserContext.Provider value={user}>{children}</UserContext.Provider>
}

export function useUser() {
  const u = useContext(UserContext)
  if (!u) {
    throw new Error('useUser must be used within UserProvider')
  }
  return u
}
