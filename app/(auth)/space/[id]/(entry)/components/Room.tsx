'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSignaling } from '../signaling-provider'
import Button from '@/components/atoms/Button'
import { logger } from '@/lib/logger'

type TrackParticipant = {
  [streamId: string]: {
    id: string
    name: string
    email: string
    image: string
    trackId: string
    streamId: string
  }
}

type RemoteVideo = {
  id: string
  name: string
  email: string
  image: string
  trackId: string
  streamId: string
  stream: MediaStream
}

export default function Room({
  setSpaceState
}: {
  setSpaceState: (state: 'exit') => void
}) {
  const { localStreamRef, hangup, remoteStreams, customMessageHandlers } =
    useSignaling()
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const [showLocal, setShowLocal] = useState(true)
  const [participantTrack, setParticipantTrack] = useState<TrackParticipant>({})
  const [remoteVideos, setRemoteVideos] = useState<RemoteVideo[]>([])
  const [showMuteBtn, setShowMuteBtn] = useState<string | null>(null)
  const [mutedMap, setMutedMap] = useState<{ [key: string]: boolean }>({})
  customMessageHandlers.current['track-participant'] = (data: string) => {
    const trackParticipants: TrackParticipant = JSON.parse(data)
    setParticipantTrack(trackParticipants)
    logger.log('WS EVENT', 'track-participant: ', participantTrack)
  }
  useEffect(() => {
    requestAnimationFrame(() => {
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current
        localVideoRef.current.play().catch(() => {})
      }
    })
  }, [localVideoRef.current])
  useEffect(() => {
    // track追加と参加者の情報取得は順不同の可能性が高いので、両方のstateが変化したらマージしてremoteVideosを更新する
    const newRemoteVideos: RemoteVideo[] = []
    for (const remoteStream of remoteStreams) {
      if (remoteStream.streamId in participantTrack === false) {
        continue
      }
      newRemoteVideos.push({
        ...remoteStream,
        ...participantTrack[remoteStream.streamId]
      })
    }
    setRemoteVideos(newRemoteVideos)
  }, [remoteStreams, participantTrack])

  return (
    <>
      <div className="
        relative w-full
        max-sm:h-[calc(var(--vh,100vh))]
        md:h-screen
        bg-black
        overflow-hidden
      ">
        {/* Remote Grid */}
        <motion.div
          layout
          className={`
        grid gap-2 w-full h-full p-2 overflow-y-scroll
        ${remoteVideos.length === 1 ? 'grid-cols-1' : ''}
        ${remoteVideos.length === 2 ? 'grid-cols-1 sm:grid-cols-2' : ''}
        ${remoteVideos.length >= 3 ? 'grid-cols-2 sm:grid-cols-3' : ''}
      `}
        >
          <AnimatePresence>
            {remoteVideos.map((v) => (
              <motion.div
                key={v.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ duration: 0.25 }}
                className="relative w-full h-full bg-black rounded-lg overflow-hidden"
              >
                {/* Video */}
                <video
                  id={`video-${v.id}`}
                  playsInline
                  autoPlay
                  muted={!!mutedMap[v.id]}
                  className="w-full h-full object-cover scale-x-[-1]"
                  ref={(el) => {
                    if (!el) return
                    if (el.srcObject !== v.stream) {
                      el.srcObject = v.stream
                      el.onloadedmetadata = () => {
                        el.play().catch(() => {})
                      }
                    }
                  }}
                />

                {/* User Info */}
                <div className="absolute top-2 left-2 flex items-center gap-2 bg-black/60 px-2 py-1 rounded">
                  <img
                    src={v.image}
                    alt={v.name}
                    className="w-6 h-6 rounded-full object-cover"
                  />
                  <span className="text-sm font-semibold text-white truncate">
                    {v.name}
                  </span>
                </div>

                {/* 音声アイコン（右下固定） */}
                <button
                  onClick={() => {
                    const videoEl = document.getElementById(
                      `video-${v.id}`
                    ) as HTMLVideoElement
                    const newMuted = !mutedMap[v.id]
                    setMutedMap((prev) => ({ ...prev, [v.id]: newMuted }))
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
                  {mutedMap[v.id] ? '🔇' : '🔊'}
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        {/* Local PiP（右上に固定） */}
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

        {/* Bottom Control Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="
        fixed bottom-3 left-1/2 -translate-x-1/2
        flex items-center gap-3
        bg-black/40 backdrop-blur-md
        px-4 py-2 rounded-full shadow-lg
      "
        >
          <Button
            onClick={async () => {
              await hangup()
              localStreamRef.current?.getTracks().forEach((t) => t.stop())
              localStreamRef.current = null
              setSpaceState('exit')
            }}
            className="bg-red-500/80 hover:bg-red-600 text-white px-3 py-1.5 rounded text-xs"
          >
            切る
          </Button>
        </motion.div>
      </div>
    </>
  )
}
