'use client'

import {  useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSignaling } from '../signaling-provider'
import Button from '@/components/atoms/Button'
import { logger } from '@/lib/logger'
import RemoteVideo, {
  RemoteVideoType
} from '@/components/organisms/RemoteVideo'
import LocalVideo from '@/components/organisms/LocalVideo'
import { spaceMemberRepositoryClient } from '@/lib/repositories/client/space-member.repository.client'
import { useSpace } from '../space-provider'
import { SpaceMember } from '@/repositories/space-member.repository'
import RequestList from './RequestList'
import EntryRequest from './EntryRequest'

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
  const { localStreamRef, hangup, remoteStreams, customMessageHandlers } =
    useSignaling()
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const { space } = useSpace()
  const [participantTrack, setParticipantTrack] = useState<TrackParticipant>({})
  const [remoteVideos, setRemoteVideos] = useState<RemoteVideoType[]>([])
  const [entryRequests, setEntryRequests] = useState<SpaceMember[]>([])
  const [requestModalOpen, setRequestModalOpen] = useState(false)
  const [requestList, setRequestList] = useState<SpaceMember[]>([])
  const [requestLoading, setRequestLoading] = useState(false)
  const pendingCount = requestList.filter(
    (r: SpaceMember) => r.status === 'pending'
  ).length
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
    customMessageHandlers.current['accept-invitation'] = (data: string) => {
      const spaceMember = JSON.parse(data)
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
      logger.log('WS EVENT', 'participant-request: ', spaceMember)
    }
    customMessageHandlers.current['participant-request'] = (data: string) => {
      const participant = JSON.parse(data)
      setEntryRequests((prev) => {
        return [...prev, participant]
      })
      logger.log('WS EVENT', 'participant-request: ', participant)
    }
  }

  useEffect(() => {
    space.membership.role === 'owner' && fetchSpaceMembers()
  }, [])
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

  const decideRequest = async (
    spaceMemberId: number,
    status: 'none' | 'approved' | 'rejected'
  ) => {
    try {
      const spaceMember = await spaceMemberRepositoryClient.decideRequest(
        space.id,
        spaceMemberId,
        {
          status
        }
      )
      setRequestList((prev) => {
        return prev.map((r) => {
          if (r.id === spaceMember.id) {
            return {
              ...r,
              status: spaceMember.status
            }
          }
          return r
        })
      })
    } catch (error) {
      alert('予期せぬエラーが発生しました')
    }
  }

  const fetchSpaceMembers = async () => {
    setRequestLoading(true)
    try {
      const { spaceMembers } =
        await spaceMemberRepositoryClient.fetchSpaceMembers(space.id)
        console.log('fetchSpaceMembers result:', spaceMembers)
      setRequestList(spaceMembers)
    } catch (error) {
      alert('予期せぬエラーが発生しました')
    } finally {
      setRequestLoading(false)
    }
  }

  const inviteNewMembers = async (members: { email: string; role: 'member' | 'admin' }[]) => {
    const { spaceMembers } = await spaceMemberRepositoryClient.inviteMembers(space.id, {
      members: members.filter((i) => i.email.trim() !== '')
    })
    setRequestList((prev) => [...prev, ...spaceMembers])
    return spaceMembers
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
          {
            space.membership.role === 'owner' &&
            <Button
              onClick={async () => {
                setRequestModalOpen(true)
                await fetchSpaceMembers()
              }}
              className="relative bg-gray-500/80 hover:bg-gray-600 text-white px-3 py-1.5 rounded text-xs"
            >
              リクエスト

              {pendingCount > 0 && (
                <span className="
                  absolute -top-1 -right-1
                  min-w-[18px] h-[18px]
                  px-1
                  flex items-center justify-center
                  rounded-full
                  bg-red-500 text-white
                  text-[10px] font-bold
                ">
                  {pendingCount}
                </span>
              )}
            </Button>
          }
        </motion.div>
      </div>
      <RequestList
        isOpen={requestModalOpen}
        setIsOpen={setRequestModalOpen}
        decideRequest={decideRequest}
        inviteNewMembers={inviteNewMembers}
        requestList={requestList}
        loading={requestLoading}
      />

      {entryRequests.map((request) => {
        return (
          <EntryRequest
            request={request}
            setEntryRequests={setEntryRequests}
            setRequestList={setRequestList}
            decideRequest={decideRequest}
            key={request.id}
          />
        )
      })}
    </>
  )
}
