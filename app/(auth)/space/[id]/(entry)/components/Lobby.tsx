'use client'
import { useSpace } from '@/app/(auth)/space/[id]/(entry)/space-provider'
import { ApiFetchError } from '@/lib/api/base-client/base-client'
import { spaceRepositoryClient } from '@/lib/repositories/client/space.repository.client'
import { useEffect, useRef, useState } from 'react'
import Modal from '@/components/atoms/Modal'
import { useUser } from '@/app/(auth)/user-provider'
import Button from '@/components/atoms/Button'
import { spaceMemberRepositoryClient } from '@/lib/repositories/client/space-member.repository.client'
import { useSignaling } from '@/app/(auth)/space/[id]/signaling-provider'

export default function Lobby({
  setSpaceState
}: {
  setSpaceState: (state: 'room') => void
}) {
  const { space, setSpace } = useSpace()
  const user = useUser()
  const { localStreamRef, connectPeer, disconnectPeerConnection } =
    useSignaling()
  useSignaling
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const [isOpenRejoinConfirmation, setIsOpenRejoinConfirmation] =
    useState(false)
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
      await connectPeer()
      const spaceRes = await spaceRepositoryClient.enableEntry(space.id, params)
      setSpace(spaceRes)
      if (spaceRes.isParticipated) {
        return setIsOpenRejoinConfirmation(true)
      }
      setIsOpenRejoinConfirmation(false)
      setSpaceState('room')
    } catch (error) {
      disconnectPeerConnection()
      if (error instanceof ApiFetchError) {
        if (error.statusCode === 403) {
          alert(error.message)
          location.href = '/'
          return
        }
        if (error.statusCode === 404) {
          alert('ルームが見つかりませんでした')
          location.href = '/'
          return
        }
        if (error.statusCode === 409) {
          setIsOpenRejoinConfirmation(true)
        }
        return
      }
      alert('予期せぬエラーが発生しました')
    }
  }
  const sendRequest = async () => {
    try {
      const membership = await spaceMemberRepositoryClient.requestEntry(
        space.id
      )
      setSpace({
        ...space,
        membership
      })
    } catch (error) {
      if (error instanceof ApiFetchError) {
        if (error.statusCode === 403) {
          alert(error.message)
          location.href = '/'
          return
        }
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
        <div className="relative bg-gray-900 rounded-2xl shadow-xl w-full max-w-md p-10 text-white">
          {space.membership.status === 'approved' && (
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-center mb-4">
                現在の参加者
              </h2>
              <ul className="space-y-3 max-h-60 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-800">
                {space.participants
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
            </div>
          )}
          <div className="flex justify-center">
            <Button
              onClick={async () => (location.href = '/')}
              className="mr-4 bg-dark border hover:bg-neutral-secondary-medium text-white font-semibold px-4 py-2 rounded-lg transition-all"
              loading
            >
              ホームに戻る
            </Button>
            {space.membership.status == 'none' ? (
              <Button
                onClick={async () => await sendRequest()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded-lg transition-all"
                loading
              >
                参加リクエスト
              </Button>
            ) : space.membership.status == 'pending' ? (
              <Button
                disabled
                className="
                  bg-neutral-700
                  text-neutral-400
                  border border-neutral-600
                  font-semibold
                  px-4 py-2
                  rounded-lg
                  cursor-not-allowed
                  opacity-70
                "
              >
                リクエスト済み
              </Button>
            ) : (
              <Button
                onClick={async () => await enterRoom()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded-lg transition-all"
                loading
              >
                参加する
              </Button>
            )}
          </div>
        </div>
      </div>
      {isOpenRejoinConfirmation && (
        <Modal
          open={isOpenRejoinConfirmation}
          onClose={() => {
            setIsOpenRejoinConfirmation(false)
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
                }}
              >
                キャンセル
              </Button>
              <Button
                className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded transition"
                onClick={async () => await enterRoom({ force: true })}
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
