'use client'

import { spaceRepositoryClient } from '@/lib/repositories/client/space.repository.client'
import { useRouter } from 'next/navigation'
import { useRoom } from '../room-provider'
import Button from '@/components/atoms/Button'

export default function Exit({
  setSpaceState
}: {
  setSpaceState: (state: 'reception') => void
}) {
  const router = useRouter()
  const { room, setRoom } = useRoom()
  const goHome = async () => {
    router.push('/')
  }

  const goBackToLobby = async () => {
    const newLobby = await spaceRepositoryClient.enterLobby(room.id)
    setRoom(newLobby)
    setSpaceState('reception')
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="bg-white rounded-lg shadow-md p-8 w-full max-w-md text-center">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">
          退出しました
        </h2>

        <p className="text-gray-600 mb-6">
          部屋から退出しました。次のアクションを選択してください。
        </p>

        <div className="flex flex-col gap-3">
          <Button
            onClick={goBackToLobby}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 rounded-lg transition"
            loading
          >
            再参加
          </Button>
          <Button
            onClick={goHome}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 rounded-lg transition"
            loading
          >
            ホームへ戻る
          </Button>
        </div>
      </div>
    </div>
  )
}
