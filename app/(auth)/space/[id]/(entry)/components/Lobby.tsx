'use client'
import { useRoom } from '@/app/(auth)/space/[id]/(entry)/room-provider'
import { ApiFetchError } from '@/lib/api/base-client/base-client'
import { spaceRepositoryClient } from '@/lib/repositories/client/space.repository.client'
import { useEffect, useRef, useState } from 'react'
import Modal from '@/components/atoms/Modal'
import { useSignaling } from '../signaling-provider'
import { useRouter } from 'next/navigation'
import { useUser } from '@/app/(auth)/user-provider'
import Button from '@/components/atoms/Button'

export default function Lobby({
  setSpaceState
}: {
  setSpaceState: (state: 'room') => void
}) {
  const { room, setRoom } = useRoom()
  const user = useUser()
  const router = useRouter()
  const { localStreamRef, connectPeer } = useSignaling()
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const [isOpenRejoinConfirmation, setIsOpenRejoinConfirmation] = useState(
    room.isJoined
  )
  const [isRightAfterEntry, setIsRightAfterEntry] = useState(true)
  useEffect(() => {
    requestAnimationFrame(() => {
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current
        localVideoRef.current.play().catch(() => {})
      }
    })
  }, [localVideoRef.current])
  const enableEntry = async (params?: { force: boolean }) => {
    try {
      const roomRes = await spaceRepositoryClient.enableEntry(room.id, params)
      setRoom(roomRes)
      if (roomRes.isJoined) {
        return setIsOpenRejoinConfirmation(true)
      }
      setIsOpenRejoinConfirmation(false)
      return true
    } catch (error) {
      if (error instanceof ApiFetchError) {
        if (error.statusCode === 404) {
          alert('ルームが見つかりませんでした')
          router.push('/')
          return
        }
        return
      }
      alert('予期せぬエラーが発生しました')
    }
  }
  const enterRoom = async (params?: { force: boolean }) => {
    setIsRightAfterEntry(false)
    const isEntryReady = await enableEntry(params)
    if (!isEntryReady) {
      return
    }
    try {
      await connectPeer()
      setSpaceState('room')
      setIsRightAfterEntry(true)
    } catch (error) {
      if (error instanceof ApiFetchError) {
        if (error.statusCode === 404) {
          alert('ルームが見つかりませんでした')
          router.push('/')
          return
        }
        return
      }
      alert('予期せぬエラーが発生しました')
    }
  }
  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center p-4 z-10">
        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-40 scale-x-[-1]"
        />
        <div className="relative bg-gray-900 rounded-2xl shadow-xl w-full max-w-md p-6 text-white">
          <h2 className="text-2xl font-bold text-center mb-4">現在の参加者</h2>
          <ul className="space-y-3 max-h-60 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-800">
            {room.participants
              .filter((p) => p.id !== user.id)
              .map((participant) => (
                <li
                  key={participant.id}
                  className="flex items-center gap-3 bg-gray-800 px-3 py-2 rounded-lg"
                >
                  <img
                    src={participant.image}
                    alt={participant.name}
                    className="w-10 h-10 rounded-full object-cover border-2 border-indigo-500"
                  />
                  <span className="text-sm font-medium">
                    {participant.name}
                  </span>
                </li>
              ))}
          </ul>
          <div className="mt-6 flex justify-center">
            <Button
              onClick={async () => router.push('/')}
              className="mr-4 bg-dark border hover:bg-neutral-secondary-medium text-white font-semibold px-4 py-2 rounded-lg transition-all"
              loading
            >
              ホームに戻る
            </Button>
            <Button
              onClick={async () => await enterRoom()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded-lg transition-all"
              loading
            >
              参加する
            </Button>
          </div>
        </div>
      </div>
      {isOpenRejoinConfirmation && (
        <Modal
          open={isOpenRejoinConfirmation}
          onClose={() => {
            setIsOpenRejoinConfirmation(false)
            setIsRightAfterEntry(false)
          }}
        >
          <div>
            <h2 className="text-lg font-semibold mb-2">確認</h2>
            <p className="mb-4">
              別の端末で既に参加されているようです。こちらの端末に切り替えますか？
            </p>

            <div className="flex justify-end gap-2">
              <Button
                className="px-3 py-1 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded transition"
                onClick={() => {
                  setIsOpenRejoinConfirmation(false)
                  setIsRightAfterEntry(false)
                }}
              >
                キャンセル
              </Button>
              <Button
                className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded transition"
                onClick={async () =>
                  isRightAfterEntry
                    ? await enableEntry({ force: true })
                    : await enterRoom({ force: true })
                }
              >
                OK
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
