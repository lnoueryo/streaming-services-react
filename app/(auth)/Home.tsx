'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { spaceRepositoryClient } from '@/lib/repositories/client/space.repository.client'
import { authRepositoryClient } from '@/lib/repositories/client/auth.repository.client'
import { useUser } from './user-provider'
import Modal from '@/components/atoms/Modal'
import Button from '@/components/atoms/Button'
import { useLoading } from '../LoadingContext'
import Link from 'next/link'
import output from '@/config'
import InviteForm from '@/components/organisms/InviteForm'
import { ConfirmModal } from '@/components/molecules/ConfirmModal'

export default function Home() {
  const { startLoading, endLoading } = useLoading()
  const user = useUser()
  const router = useRouter()
  // TODO open,closeでフォームをリセット
  const [isOpenCreateRoomForm, setIsOpenCreateRoomForm] = useState(false)
  const [spaceCreated, setSpaceCreated] = useState<{
    id: string
    url: string
  } | null>(null)
  const [createdModal, setCreatedModal] = useState(false)

  const [name, setName] = useState('')
  const [privacy, setPrivacy] = useState<'public' | 'protected' | 'private'>(
    'public'
  )
  const [members, setInvitees] = useState<
    { email: string; role: 'member' | 'admin' }[]
  >([{ email: '', role: 'member' }])

  const handleSubmit = async () => {
    startLoading()

    const payload = {
      name,
      privacy,
      members:
        privacy !== 'public' ? members.filter((i) => i.email.trim() !== '') : []
    }

    try {
      const space = await spaceRepositoryClient.createSpace(payload)
      setIsOpenCreateRoomForm(false)
      setSpaceCreated(space)
      setCreatedModal(true)
    } finally {
      endLoading()
    }
  }

  const handleLogout = async () => {
    startLoading()
    await authRepositoryClient.logout()
    router.replace('/login')
    endLoading()
  }


  const handleCopy = async () => {
    if (!spaceCreated) {
      return
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(output.streamingApiFrontendOrigin + spaceCreated.url)
      alert('URL をコピーしました')
    }
  }

  return (
    <>
      <div className="max-w-lg mx-auto mt-20">
        <div className="flex flex-col gap-4 text-center">
          <h1 className="text-2xl font-bold">ホーム</h1>

          <p className="text-gray-700">
            ログイン中：{user.name} {user.email || 'No email'}
          </p>

          <Button
            onClick={() => setIsOpenCreateRoomForm(true)}
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
      <Modal
        open={isOpenCreateRoomForm}
        onClose={() => setIsOpenCreateRoomForm(false)}
        persistent
      >
        <div className="space-y-4 p-4 w-full max-w-md">
          <h2 className="text-xl font-semibold">スペースを作成</h2>

          {/* 名前 */}
          <div>
            <label className="block text-sm font-medium">名前 (任意)</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full border rounded px-2 py-1"
              placeholder="スペース名"
            />
          </div>

          {/* プライバシー */}
          <div>
            <label className="block text-sm font-medium text-white">
              プライバシー
            </label>

            <select
              value={privacy}
              onChange={(e) => setPrivacy(e.target.value as any)}
              className="
                mt-1 block w-full rounded border
                bg-gray-800 text-white
                border-gray-600
                px-2 py-1
                focus:outline-none focus:ring
              "
            >
              <option value="public">公開</option>
              <option value="protected">
                一部非公開 (招待URLを知っている人のみ)
              </option>
              <option value="private">非公開 (招待制)</option>
            </select>
          </div>

          {/* Private の場合のみ Emails + Role */}
          {privacy !== 'public' && (
            <InviteForm
              value={members}
              onChange={setInvitees}
            />
          )}

          {/* Submit ボタン */}
          <div className="flex justify-end gap-2">
            <Button
              onClick={() => setIsOpenCreateRoomForm(false)}
              className="px-3 py-1 bg-gray-200"
            >
              キャンセル
            </Button>
            <Button
              onClick={handleSubmit}
              className="px-3 py-1 bg-blue-500 text-white"
            >
              作成
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={createdModal && !!spaceCreated}
        onClose={() => setCreatedModal(false)}
        title="スペースが作成されました"
        message="下記のURLを共有してください。招待されたメンバーはこのURLからスペースに参加できます。"
        body={
          <div className="mt-2 py-2 text-sm text-blue-700 rounded break-all">
            <Link href={`${spaceCreated?.url}`}>
              {output.streamingApiFrontendOrigin}{spaceCreated?.url}
            </Link>
          </div>
        }
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button
              onClick={() => setCreatedModal(false)}
              className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
            >
              閉じる
            </Button>
            <Button
              onClick={handleCopy}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              URL をコピー
            </Button>
          </div>
        }
        persistent
      />
    </>
  )
}
