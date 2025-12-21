'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSignaling } from '../signaling-provider'
import Button from '@/components/atoms/Button'
import { logger } from '@/lib/logger'
import RemoteVideo, { RemoteVideoType } from '@/components/organisms/RemoteVideo'
import LocalVideo from '@/components/organisms/LocalVideo'
import { spaceMemberRepositoryClient } from '@/lib/repositories/client/space-member.repository.client'
import { useSpace } from '../space-provider'
import Modal from '@/components/atoms/Modal'
import { useRouter } from 'next/navigation'

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

export default function Room({
  setSpaceState
}: {
  setSpaceState: (state: 'exit') => void
}) {
  const router = useRouter()
  const { localStreamRef, hangup, remoteStreams, customMessageHandlers } =
    useSignaling()
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const { space, setSpace } = useSpace()
  const [participantTrack, setParticipantTrack] = useState<TrackParticipant>({})
  const [remoteVideos, setRemoteVideos] = useState<RemoteVideoType[]>([])
  const [entryRequests, setEntryRequests] = useState<{
    id: number
    name: string
    email: string
    image: string
    userId: string
    role: string
  }[]>([])
  customMessageHandlers.current['track-participant'] = (data: string) => {
    const trackParticipants: TrackParticipant = JSON.parse(data)
    setParticipantTrack(trackParticipants)
    logger.log('WS EVENT', 'track-participant: ', participantTrack)
  }
  customMessageHandlers.current['duplicate-participant'] = () => {
    alert('別の端末から同じアカウントで入室があったため、退室します。')
    setSpaceState('exit')
    logger.log('WS EVENT', 'duplicate-participant: ', participantTrack)
  }
  if (space.membership.role === 'owner') {
    customMessageHandlers.current['participant-request'] = (data: string) => {
      const participant = JSON.parse(data)
      setEntryRequests((prev) => {
        return [...prev, participant]
      })
      logger.log('WS EVENT', 'participant-request: ', participant)
    }
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
    setRemoteVideos(newRemoteVideos)
  }, [remoteStreams, participantTrack])

  const decideRequest = async (spaceMemberId: number, status: 'approved' | 'rejected') => {
    try {
      const spaceMember = await spaceMemberRepositoryClient.decideRequest(space.id, spaceMemberId, {
        status
      })
      // TODO: 参加メンバーの情報管理して一覧で表示、ステータス変更できるようにする
      console.log('decideRequest result:', spaceMember)
    } catch (error) {
      alert('予期せぬエラーが発生しました')
    }
  }

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
              <RemoteVideo {...v} key={v.id} />
            ))}
          </AnimatePresence>
        </motion.div>

        {/* Local PiP（右上に固定） */}
        <LocalVideo stream={localStreamRef} />

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
      {
        entryRequests.map((request) => {
          return (
            <Modal
              open={!!request}
              onClose={() => {
                setEntryRequests((prev) => prev.filter((r) => r.userId !== request.userId))
              }}
            >
              <div>
                <h2 className="text-lg font-semibold mb-2">入室のリクエスト</h2>
                <p className="mb-4">
                  {request.email}が入室をリクエストしています。
                </p>

                <div className="flex justify-end gap-2">
                  <Button
                    className="px-3 py-1 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded transition"
                    onClick={() => {
                      setEntryRequests((prev) => prev.filter((r) => r.userId !== request.userId))
                    }}
                  >
                    キャンセル
                  </Button>
                  <Button
                    className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded transition"
                    onClick={async () => {
                        decideRequest(request.id, 'rejected')
                        setEntryRequests((prev) => prev.filter((r) => r.userId !== request.userId))
                      }
                    }
                  >
                    拒否
                  </Button>
                  <Button
                    className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded transition"
                    onClick={async () => {
                        decideRequest(request.id, 'approved')
                        setEntryRequests((prev) => prev.filter((r) => r.userId !== request.userId))
                      }
                    }
                  >
                    承認
                  </Button>
                </div>
              </div>
            </Modal>
          )
        })
      }
    </>
  )
}
