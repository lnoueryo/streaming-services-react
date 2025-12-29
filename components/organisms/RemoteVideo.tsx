'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'

export type RemoteVideoType = {
  id: string
  name: string
  email: string
  image: string
  trackId: string
  streamId: string
  stream: MediaStream
}

export default function RemoteVideo({
  id,
  name,
  image,
  stream
}: RemoteVideoType) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [muted, setMuted] = useState(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video || !stream) return

    video.srcObject = stream
    video.muted = muted

    const play = async () => {
      try {
        await video.play()
      } catch (e) {
        console.warn('video play failed:', e)
      }
    }

    play()

    return () => {
      if (video.srcObject === stream) {
        video.srcObject = null
      }
    }
  }, [stream, muted])

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="relative w-full h-full bg-black rounded-lg overflow-hidden"
    >
      {/* video は framer-motion の影響を受けさせない */}
      <video
        ref={videoRef}
        playsInline
        autoPlay
        muted={muted}
        className="w-full h-full object-cover scale-x-[-1]"
      />

      {/* User Info */}
      <div className="absolute top-2 left-2 flex items-center gap-2 bg-black/60 px-2 py-1 rounded">
        <img
          src={image}
          alt={name}
          className="w-6 h-6 rounded-full object-cover"
        />
        <span className="text-sm font-semibold text-white truncate">
          {name}
        </span>
      </div>

      {/* Mute */}
      <button
        onClick={() => setMuted((v) => !v)}
        className="absolute bottom-2 right-2 bg-black/70 text-white p-2 rounded-full"
      >
        {muted ? '🔇' : '🔊'}
      </button>
    </motion.div>
  )
}
