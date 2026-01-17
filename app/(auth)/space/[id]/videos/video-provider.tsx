'use client'

import { Video } from '@/repositories/streaming.repository'
import { createContext, useContext, useState, ReactNode } from 'react'

type VideosContextValue = {
  videos: Video[]
  setVideos: (videos: Video[]) => void
}

const VideosContext = createContext<VideosContextValue | null>(null)

export function VideosProvider({
  initialVideos,
  children
}: {
  initialVideos: Video[]
  children: ReactNode
}) {
  const [videos, setVideos] = useState<Video[]>(initialVideos)
  return (
    <VideosContext.Provider value={{ videos, setVideos }}>
      {children}
    </VideosContext.Provider>
  )
}

export function useVideos() {
  const ctx = useContext(VideosContext)
  if (!ctx) throw new Error('useVideos must be used within VideosProvider')
  return ctx
}
