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
import ChatPanel from '@/components/organisms/ChatPanel'
import MobileChatOverlay from '@/components/organisms/MobileChatOverlay'
import MobileChatInput from '@/components/organisms/MobileChatInput'
import { useUser } from '@/app/(auth)/user-provider'

export default function Room({
  setSpaceState,
  remoteVideos,
  entryRequests,
  setEntryRequests,
  messages
}: {
  setSpaceState: (state: 'exit') => void
  remoteVideos: RemoteVideoType[]
  entryRequests: SpaceMember[]
  setEntryRequests: React.Dispatch<React.SetStateAction<SpaceMember[]>>
  messages: {
    id: string
    user: { id: string; name: string; email: string; image: string }
    text: string
    createdAt: Date
  }[]
}) {
  const user = useUser()
  const { localStreamRef, channelsRef, hangup } = useSignaling()
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const { space } = useSpace()
  const [requestModalOpen, setRequestModalOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const {
    requestList,
    requestLoading,
    pendingCount,
    decideRequest,
    fetchSpaceMembers,
    inviteNewMembers
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

        {/* Local PiP */}
        <LocalVideo stream={localStreamRef} />

        {/* Bottom Control Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="
            fixed bottom-16 md:bottom-3
            left-2 right-2
            md:left-1/2 md:-translate-x-1/2 md:right-auto
            flex items-center justify-center gap-2
            bg-black/40 backdrop-blur-md
            px-3 py-2 rounded-full shadow-lg
            z-30
          "
        >
          <Button
            onClick={async () => {
              await hangup()
              localStreamRef.current?.getTracks().forEach((t) => t.stop())
              localStreamRef.current = null
              setSpaceState('exit')
            }}
            className="
              bg-red-500/80 hover:bg-red-600
              text-white px-4 py-3
              rounded text-x
              whitespace-nowrap shrink-0
            "
          >
            📞
          </Button>

          <Button
            onClick={() => setChatOpen(true)}
            className="
              hidden md:inline-flex
              bg-gray-500/80 hover:bg-gray-600
              text-white px-4 py-3
              rounded text-x
              whitespace-nowrap shrink-0
            "
          >
            💬
          </Button>

          {space.membership.role === 'owner' && (
            <Button
              onClick={async () => {
                setRequestModalOpen(true)
                await fetchSpaceMembers()
              }}
              className="
                relative
                bg-gray-500/80 hover:bg-gray-600
                text-white px-4 py-3
                rounded text-x
                whitespace-nowrap shrink-0
              "
            >
              🫆
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

      {/* 既存 UI */}
      <RequestList
        isOpen={requestModalOpen}
        setIsOpen={setRequestModalOpen}
        decideRequest={decideRequest}
        inviteNewMembers={inviteNewMembers}
        requestList={requestList}
        loading={requestLoading}
        space={space}
      />

      {entryRequests.map((request) => (
        <EntryRequest
          request={request}
          setEntryRequests={setEntryRequests}
          decideRequest={decideRequest}
          key={request.id}
        />
      ))}

      {/* ===== チャット UI（ここが追加部分） ===== */}
      <ChatPanel
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        messages={messages}
        onSend={(text) => {
          if (!text.trim()) return

          channelsRef.current['room'].send(
            JSON.stringify({
              event: 'chat',
              message: {
                id: crypto.randomUUID(),
                text,
                user,
                createdAt: new Date()
              }
            })
          )
        }}
      />

      {/* ===== モバイル用チャット（表示） ===== */}
      {messages.length > 0 && (
        <div className="md:hidden">
          <MobileChatOverlay messages={messages} />
        </div>
      )}

      {/* ===== モバイル用チャット（入力） ===== */}
      <div className="md:hidden">
        <MobileChatInput
          onSend={(text) => {
            if (!text.trim()) return

            channelsRef.current['room'].send(
              JSON.stringify({
                event: 'chat',
                message: {
                  id: crypto.randomUUID(),
                  text,
                  user,
                  createdAt: new Date()
                }
              })
            )
          }}
        />
      </div>
    </>
  )
}
