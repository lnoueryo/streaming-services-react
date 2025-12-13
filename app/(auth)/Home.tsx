'use client'
import { spaceRepositoryClient } from '@/lib/repositories/client/space.repository.client'
import { authRepositoryClient } from '@/lib/repositories/client/auth.repository.client'

import { useUser } from './user-provider'
import { useRouter } from 'next/navigation'
import Button from '@/components/atoms/Button'
import { useLoading } from '../LoadingContext'
export default function Home() {
  const { startLoading, endLoading } = useLoading()
  const user = useUser()
  const router = useRouter()
  const handleCreateSpace = async () => {
    startLoading()
    const space = await spaceRepositoryClient.createSpace()
    router.push(`/space/${space.id}`)
    endLoading()
  }

  const handleLogout = async () => {
    startLoading()
    await authRepositoryClient.logout()
    router.replace('/login')
    endLoading()
  }

  return (
    <div className="max-w-lg mx-auto mt-20">
      <div className=" flex flex-col gap-4 text-center">
        <h1 className="text-2xl font-bold">ホーム</h1>

        <p className="text-gray-700">
          ログイン中：{user.name} {user.email || 'No email'}
        </p>

        <Button
          onClick={handleCreateSpace}
          className="bg-blue-600 text-white p-3 rounded"
        >
          ルーム作成
        </Button>

        <Button
          onClick={handleLogout}
          className="bg-gray-700 text-white p-3 rounded"
        >
          ログアウト
        </Button>
      </div>
    </div>
  )
}
