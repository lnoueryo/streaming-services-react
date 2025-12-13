'use client'

import { RoomResponse } from '@/repositories/space.repository'
import { createContext, useContext, useState, ReactNode } from 'react'

type RoomContextValue = {
  room: RoomResponse
  setRoom: (room: RoomResponse) => void
}

const RoomContext = createContext<RoomContextValue | null>(null)

export function RoomProvider({
  initialRoom,
  children
}: {
  initialRoom: RoomResponse
  children: ReactNode
}) {
  const [room, setRoom] = useState<RoomResponse>(initialRoom)

  return (
    <RoomContext.Provider value={{ room, setRoom }}>
      {children}
    </RoomContext.Provider>
  )
}

export function useRoom() {
  const ctx = useContext(RoomContext)
  if (!ctx) throw new Error('useRoom must be used within RoomProvider')
  return ctx
}
