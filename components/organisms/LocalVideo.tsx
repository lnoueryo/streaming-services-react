'use client'

import { useEffect, useRef, useState } from 'react'
import Button from '../atoms/Button'

export default function LocalVideo({
  stream
}: {
  stream: React.RefObject<MediaStream | null>
}) {
  const [showLocal, setShowLocal] = useState(true)
  const localVideoRef = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    requestAnimationFrame(() => {
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream.current
        localVideoRef.current.play().catch(() => {})
      }
    })
  }, [localVideoRef.current])
  return (
    <>
      {showLocal}
      {showLocal && (
        <div
          className="
        absolute top-3 right-3
        w-28 h-44 sm:w-36 sm:h-56
        rounded-lg overflow-hidden border border-white/20 bg-black/80 shadow-xl
        transition-all duration-200
      "
        >
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover scale-x-[-1]"
          />
          <Button
            onClick={() => setShowLocal(false)}
            className="absolute top-1 right-1 bg-black/60 text-white text-xs px-2 py-0.5 rounded"
          >
            ×
          </Button>
          <p className="text-[10px] text-white/70 absolute bottom-0 w-full text-center bg-black/30">
            あなたの映像
          </p>
        </div>
      )}

      {!showLocal && (
        <Button
          onClick={() => setShowLocal(true)}
          className="fixed top-3 right-3 bg-white/10 hover:bg-white/20 text-white px-3 py-2 text-xs rounded-lg shadow-xl"
        >
          あなたの映像
        </Button>
      )}
    </>
  )
}
