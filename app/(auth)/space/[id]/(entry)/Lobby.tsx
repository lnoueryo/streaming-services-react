'use client'
import { useLobby } from '@/app/(auth)/space/[id]/(entry)/lobby-provider'
import { ApiFetchError } from '@/lib/api/base-client/base-client'
import { spaceRepositoryClient } from '@/lib/repositories/client/space.repository.client'
import { useEffect, useRef, useState } from 'react'
import Modal from '@/components/atoms/modal'
import { useSignaling } from './signaling-provider'
import { useRouter } from 'next/navigation'

export default function Lobby({
  setSpaceState
}: {
  setSpaceState: (state: 'room') => void
}) {
  const { lobby, setLobby } = useLobby()
  const router = useRouter()
  const { localStreamRef, connectPeer } = useSignaling()
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const [isOpenRejoinConfirmation, setIsOpenRejoinConfirmation] = useState(
    lobby.isJoined
  )
  useEffect(() => {
    requestAnimationFrame(() => {
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current
        localVideoRef.current.play().catch(() => {})
      }
    })
  }, [localVideoRef.current])
  const enterRoom = async (params?: { force: boolean }) => {
    try {
      const lobbyRes = await spaceRepositoryClient.enterRoom(lobby.id, params)
      setLobby(lobbyRes)
      console.log(lobbyRes)
      if (lobbyRes.isJoined) {
        return setIsOpenRejoinConfirmation(true)
      }
      await connectPeer()
      setSpaceState('room')
    } catch (error) {
      if (error instanceof ApiFetchError) {
        if (error.statusCode === 404) {
          alert('ルームが見つかりませんでした')
          router.push('/')
          return
        }
        console.warn(error)
        return
      }
      alert('予期せぬエラーが発生しました')
    }
  }
  return (
    <>
      <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
        <div>
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover scale-x-[-1]"
          />
        </div>
        <div className="bg-gray-800 w-full max-w-md rounded-xl shadow-2xl p-6 text-white">
          <h2 className="text-lg font-semibold mb-4 text-center">
            現在の参加者
          </h2>
          <ul className="space-y-3 max-h-64 overflow-y-auto pr-2">
            {lobby.users.map((user) => (
              <li
                key={user.id}
                className="flex items-center gap-3 bg-gray-700 px-3 py-2 rounded-lg"
              >
                <img
                  src={user.image}
                  alt={user.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <span className="text-sm">{user.name}</span>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex justify-center">
            <button
              onClick={async () => await enterRoom()}
              className="
                bg-blue-500 hover:bg-blue-600
                text-white font-semibold
                px-6 py-2 rounded-lg
                transition-all
              "
              // disabled={roomState === 'exit'}
            >
              参加
            </button>
          </div>
        </div>
      </div>
      {isOpenRejoinConfirmation && (
        <Modal
          open={isOpenRejoinConfirmation}
          onClose={() => setIsOpenRejoinConfirmation(false)}
        >
          <h2 className="text-lg font-semibold mb-2">確認</h2>
          <p className="mb-4">
            別の端末で既に参加されているようです。こちらの端末に切り替えますか。
          </p>

          <div className="flex justify-end gap-2">
            <button
              className="px-3 py-1 bg-gray-700 rounded"
              onClick={() => setIsOpenRejoinConfirmation(false)}
            >
              キャンセル
            </button>
            <button
              className="px-3 py-1 bg-red-500 rounded"
              onClick={() => enterRoom({ force: true })}
            >
              OK
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}
