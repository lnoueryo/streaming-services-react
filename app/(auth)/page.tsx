'use client'
import { roomRepositoryClient } from '@/lib/repositories/client/room.repository.client'
import { authRepositoryClient } from '@/lib/repositories/client/auth.repository.client'

import { useUser } from './user-provider'
import { useRouter } from 'next/navigation'
export default function HomePage() {
  const user = useUser()
  const router = useRouter()
  const handleCreateRoom = async () => {
    const room = await roomRepositoryClient.createRoom()
    router.push(`/room/${room.id}`)
  }

  const handleLogout = async () => {
    await authRepositoryClient.logout()
    router.replace('/login')
  }

  return (
    <div className="max-w-lg mx-auto mt-20">
      <div className=" flex flex-col gap-4 text-center">
        <h1 className="text-2xl font-bold">ホーム</h1>

        <p className="text-gray-700">
          ログイン中：{user.name} {user.email || 'No email'}
        </p>

        <button
          onClick={handleCreateRoom}
          className="bg-blue-600 text-white p-3 rounded"
        >
          ルーム作成
        </button>

        <button
          onClick={handleLogout}
          className="bg-gray-700 text-white p-3 rounded"
        >
          ログアウト
        </button>
      </div>
    </div>
  )
}
