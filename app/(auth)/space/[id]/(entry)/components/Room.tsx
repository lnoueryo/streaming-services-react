'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSignaling } from '@/app/(auth)/space/[id]/signaling-provider'
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
import { useToast } from '@/app/ToastContext'
import { useLoading } from '@/app/LoadingContext'

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
  const { showToast } = useToast()
  const { startLoading, endLoading } = useLoading()
  const user = useUser()
  const { localStreamRef, channelsRef, hangup, customDataMessageHandlers } =
    useSignaling()
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const { space } = useSpace()
  const [requestModalOpen, setRequestModalOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [recording, setRecording] = useState(false)
  const [loading, setLoading] = useState(false)
  const {
    requestList,
    requestLoading,
    pendingCount,
    decideRequest,
    fetchSpaceMembers,
    inviteNewMembers
  } = useSpaceMember()
  customDataMessageHandlers.current['room']['record-start'] = () => {
    endLoading()
    setLoading(false)
    setRecording(true)
    showToast('録画が開始されました', 'success')
  }
  customDataMessageHandlers.current['room']['record-stop'] = () => {
    endLoading()
    setLoading(false)
    setRecording(false)
    showToast('録画が停止されました')
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
        <AnimatePresence>
          {recording && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="
                fixed
                top-3
                left-1/2 -translate-x-1/2
                md:left-4 md:translate-x-0
                z-40
                flex items-center gap-2
                bg-black/70 backdrop-blur
                px-3 py-1.5
                rounded-full
                shadow-lg
                pointer-events-none
              "
            >
              <motion.span
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ repeat: Infinity, duration: 1 }}
                className="w-3 h-3 rounded-full bg-red-500"
              />
              <span className="text-red-400 text-xs font-bold tracking-widest">
                REC
              </span>
            </motion.div>
          )}
        </AnimatePresence>
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
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="
            fixed bottom-16 md:bottom-4
            left-1/2 -translate-x-1/2
            flex items-center gap-3
            bg-black/50 backdrop-blur-md
            px-4 py-3
            rounded-full shadow-xl
            z-30
          "
        >
          {/* Chat */}
          <Button
            onClick={() => setChatOpen(true)}
            className="
              hidden md:flex
              w-11 h-11 rounded-full
              flex items-center justify-center
              bg-gray-700 hover:bg-gray-600
              text-white text-lg
            "
          >
            💬
          </Button>

          {/* Request */}
          {space.membership.role === 'owner' && (
            <>
              <Button
                onClick={async () => {
                  setRequestModalOpen(true)
                  await fetchSpaceMembers()
                }}
                className="
                relative
                w-11 h-11 rounded-full
                flex items-center justify-center
                bg-gray-700 hover:bg-gray-600
                text-white text-lg
              "
              >
                🫆
                {pendingCount > 0 && (
                  <span
                    className="
                    absolute -top-1 -right-1
                    w-4 h-4
                    rounded-full
                    bg-red-500
                    text-[9px] font-bold
                    flex items-center justify-center
                    text-white
                  "
                  >
                    {pendingCount}
                  </span>
                )}
              </Button>
              <Button
                onClick={() => {
                  startLoading()
                  setLoading(true)
                  channelsRef.current['room'].send(
                    JSON.stringify({
                      event: recording ? 'record-stop' : 'record-start',
                      message: {}
                    })
                  )
                }}
                className={`
                w-11 h-11 rounded-full
                flex items-center justify-center
                transition
                ${
                  recording
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-white hover:bg-gray-100 text-black'
                }
              `}
                disabled={loading}
              >
                {recording ? '■' : '●'}
              </Button>
            </>
          )}

          {/* Hangup */}
          <Button
            onClick={async () => {
              await hangup()
              localStreamRef.current?.getTracks().forEach((t) => t.stop())
              localStreamRef.current = null
              setSpaceState('exit')
            }}
            className="
              w-11 h-11 rounded-full
              flex items-center justify-center
              bg-red-600 hover:bg-red-700
              text-white text-lg
            "
          >
            📞
          </Button>
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
