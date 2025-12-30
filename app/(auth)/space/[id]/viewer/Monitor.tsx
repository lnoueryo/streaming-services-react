'use client'

import { motion, AnimatePresence } from 'framer-motion'
import RemoteVideo, {
  RemoteVideoType
} from '@/components/organisms/RemoteVideo'

import { useState, useEffect } from 'react'
import { signalingRepositoryClient } from '@/lib/repositories/client/signaling.repository.client'
import { useSignaling } from '../signaling-provider'
import { logger } from '@/lib/logger'
import Button from '@/components/atoms/Button'
import RequestList from '@/components/organisms/RequestList'
import { SpaceUser } from '@/repositories/space-member.repository'
import { useSpaceMember } from './space-member-provider'

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

export default function Monitor() {
  const {
    credentialRef,
    remoteStreams,
    customDataMessageHandlers,
    connectWS,
    connectPeer,
    sendWS
  } = useSignaling()
  const {
    requestList,
    requestLoading,
    setRequestList,
    pendingCount,
    decideRequest,
    fetchSpaceMembers
  } = useSpaceMember()
  const [participantTrack, setParticipantTrack] = useState<TrackParticipant>({})
  const [remoteVideos, setRemoteVideos] = useState<RemoteVideoType[]>([])
  const [ready, setReady] = useState(false)
  const [requestModalOpen, setRequestModalOpen] = useState(false)

  customDataMessageHandlers.current['room'] = {}
  customDataMessageHandlers.current['room']['track-participant'] = (
    data: TrackParticipant
  ) => {
    console.log('DATA', data)
    setParticipantTrack(data)
    logger.log('DC EVENT', 'track-participant: ', participantTrack)
  }
  customDataMessageHandlers.current['room']['change-member-state'] = (
    spaceMember: SpaceUser
  ) => {
    setRequestList((prev) => {
      if (prev.some((r) => r.id === spaceMember.id)) {
        return prev.map((r) => {
          if (r.id === spaceMember.id) {
            return spaceMember
          }
          return r
        })
      }
      return [...prev, spaceMember]
    })
    logger.log('WS EVENT', 'change-member-state: ', spaceMember)
  }
  useEffect(() => {
    const newRemoteVideos: RemoteVideoType[] = []
    for (const remoteStream of remoteStreams) {
      if (remoteStream.streamId in participantTrack === false) {
        continue
      }
      newRemoteVideos.push({
        ...remoteStream,
        ...participantTrack[remoteStream.streamId]
      })
    }
    console.log('remoteVideos updated:', newRemoteVideos)
    setRemoteVideos(newRemoteVideos)
  }, [remoteStreams, participantTrack])
  useEffect(() => {
    start()
  }, [])

  const start = async () => {
    try {
      credentialRef.current =
        await signalingRepositoryClient.generateTurnCredential()
      await connectWS()
      await connectPeer()
    } catch (e) {
      logger.error('getUserMedia error:', e)
      return
    }
  }

  return (
    <>
      <div
        className="
        relative w-full
        max-sm:h-[calc(var(--vh,100vh))]
        md:h-screen
        bg-black
        overflow-hidden
      "
      >
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
            {ready &&
              remoteVideos.map((v) => <RemoteVideo {...v} key={v.id} />)}
          </AnimatePresence>
        </motion.div>

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
              setRequestModalOpen(true)
              await fetchSpaceMembers()
            }}
            className="relative bg-gray-500/80 hover:bg-gray-600 text-white px-3 py-1.5 rounded text-xs"
          >
            リクエスト
            {pendingCount > 0 && (
              <span
                className="
                absolute -top-1 -right-1
                min-w-[18px] h-[18px]
                px-1
                flex items-center justify-center
                rounded-full
                bg-red-500 text-white
                text-[10px] font-bold
              "
              >
                {pendingCount}
              </span>
            )}
          </Button>
          <Button
            onClick={async () => {
              sendWS({ event: 'offer' })
              setReady(true)
            }}
            className="relative bg-gray-500/80 hover:bg-gray-600 text-white px-3 py-1.5 rounded text-xs"
          >
            表示
          </Button>
        </motion.div>
      </div>
      <RequestList
        isOpen={requestModalOpen}
        setIsOpen={setRequestModalOpen}
        decideRequest={decideRequest}
        requestList={requestList}
        loading={requestLoading}
      />
    </>
  )
}
