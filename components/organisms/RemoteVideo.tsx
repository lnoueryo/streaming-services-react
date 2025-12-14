'use client'

import { useState } from 'react'
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

export default function RemoteVideo(stream: RemoteVideoType) {
  const [mutedMap, setMutedMap] = useState<{ [key: string]: boolean }>({})
  return (
    <>
      <motion.div
        key={stream.id}
        layout
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.85 }}
        transition={{ duration: 0.25 }}
        className="relative w-full h-full bg-black rounded-lg overflow-hidden"
      >
        <video
          id={`video-${stream.id}`}
          playsInline
          autoPlay
          muted={!!mutedMap[stream.id]}
          className="w-full h-full object-cover scale-x-[-1]"
          ref={(el) => {
            if (!el) return
            if (el.srcObject !== stream.stream) {
              el.srcObject = stream.stream
              el.onloadedmetadata = () => {
                el.play().catch(() => {})
              }
            }
          }}
        />

        {/* User Info */}
        <div className="absolute top-2 left-2 flex items-center gap-2 bg-black/60 px-2 py-1 rounded">
          <img
            src={stream.image}
            alt={stream.name}
            className="w-6 h-6 rounded-full object-cover"
          />
          <span className="text-sm font-semibold text-white truncate">
            {stream.name}
          </span>
        </div>

        {/* 音声アイコン（右下固定） */}
        <button
          onClick={() => {
            const videoEl = document.getElementById(
              `video-${stream.id}`
            ) as HTMLVideoElement
            const newMuted = !mutedMap[stream.id]
            setMutedMap((prev) => ({ ...prev, [stream.id]: newMuted }))
            if (videoEl) {
              videoEl.muted = newMuted
              if (!newMuted) videoEl.play().catch(() => {})
            }
          }}
          className="
        absolute bottom-2 right-2
        bg-black/70 text-white p-2 rounded-full
        text-lg
        transition-all
      "
        >
          {mutedMap[stream.id] ? '🔇' : '🔊'}
        </button>
      </motion.div>
    </>
  )
}
