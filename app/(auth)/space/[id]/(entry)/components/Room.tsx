'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSignaling } from '../../signaling-provider'
import Button from '@/components/atoms/Button'
import RemoteVideo, {
  RemoteVideoType
} from '@/components/organisms/RemoteVideo'
import LocalVideo from '@/components/organisms/LocalVideo'
import { useSpace } from '../space-provider'
import { SpaceMember } from '@/repositories/space-member.repository'
import RequestList from '../../../../../../components/organisms/RequestList'
import EntryRequest from './EntryRequest'
import { useSpaceMember } from '../space-member-provider'

export default function Room({
  setSpaceState,
  remoteVideos,
  entryRequests,
  setEntryRequests,
}: {
  setSpaceState: (state: 'exit') => void,
  remoteVideos: RemoteVideoType[],
  entryRequests: SpaceMember[]
  setEntryRequests: React.Dispatch<React.SetStateAction<SpaceMember[]>>
}) {
  const { localStreamRef, hangup } =
    useSignaling()
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const { space } = useSpace()
  const [requestModalOpen, setRequestModalOpen] = useState(false)

  const {
    requestList,
    requestLoading,
    pendingCount,
    decideRequest,
    fetchSpaceMembers,
    inviteNewMembers,
  } = useSpaceMember()

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
          {space.membership.role === 'owner' && (
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
          )}
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
            decideRequest={decideRequest}
            key={request.id}
          />
        )
      })}
    </>
  )
}
