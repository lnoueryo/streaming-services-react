'use client'

import Button from '@/components/atoms/Button'
import { ConfirmModal } from '@/components/molecules/ConfirmModal'
import { JSX, useState } from 'react'
import { SpaceMember } from '@/repositories/space-member.repository'
import { LoadingSpinner } from '@/components/atoms/LoadingSpinner'
import { UserIcon, ShieldCheckIcon, CrownIcon } from 'lucide-react'
import { useUser } from '@/app/(auth)/user-provider'
import InviteForm from '@/components/organisms/InviteForm'

export default function RequestList({
  space,
  isOpen,
  setIsOpen,
  decideRequest,
  inviteNewMembers,
  requestList,
  loading
}: {
  space?: {
    id: string
    invitationToken: string
  }
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  decideRequest: (
    memberId: number,
    status: 'none' | 'approved' | 'rejected'
  ) => Promise<void>
  inviteNewMembers?: (
    members: { email: string; role: 'member' | 'admin' }[]
  ) => Promise<SpaceMember[]>
  requestList: SpaceMember[]
  loading: boolean
}) {
  const user = useUser()
  const roleIconMap: Record<SpaceMember['role'], JSX.Element> = {
    member: <UserIcon className="w-4 h-4 text-gray-400" />,
    admin: <ShieldCheckIcon className="w-4 h-4 text-blue-400" />,
    owner: <CrownIcon className="w-4 h-4 text-yellow-400" />
  }

  const statusStyleMap: Record<SpaceMember['status'], string> = {
    none: 'border-l-4 border-gray-400 bg-gray-800',
    pending: 'border-l-4 border-yellow-400 bg-gray-800',
    approved: 'border-l-4 border-blue-400 bg-gray-800',
    rejected: 'border-l-4 border-red-400 bg-gray-800'
  }

  const canApprove = (status: SpaceMember['status']) => status === 'pending'
  const canReject = (status: SpaceMember['status']) =>
    status === 'none' || status === 'pending' || status === 'approved'
  const canCancel = (status: SpaceMember['status']) => status === 'rejected'
  const [members, setInvitees] = useState<
    { email: string; role: 'member' | 'admin' }[]
  >([{ email: '', role: 'member' }])
  const [inviteFormOpen, setInviteFormOpen] = useState(false)

  const handleSubmit = async () => {
    if (!inviteNewMembers) {
      return
    }
    try {
      const spaceMembers = await inviteNewMembers(members)
      setInvitees([{ email: '', role: 'member' }])
      setInviteFormOpen(false)
      alert('招待メールを送信しました')
    } catch (error) {
      alert('予期せぬエラーが発生しました')
    }
  }
  return (
    <>
      <ConfirmModal
        open={isOpen}
        onClose={async () => {
          setIsOpen(false)
        }}
        title="リクエスト一覧"
        body={
          loading ? (
            <div className="flex items-center justify-center py-10">
              <LoadingSpinner size={48} />
            </div>
          ) : (
            <div className="py-3">
              {requestList.map((request: SpaceMember) => (
                <div
                  key={request.id}
                  className={`
                    flex items-center justify-between mb-2 py-2 rounded
                    ${statusStyleMap[request.status]}
                  `}
                >
                  {/* 左側 */}
                  <div className="flex items-center gap-3">
                    <img className="w-8 h-8 rounded-full" />
                    <div className="text-sm">
                      <div className="flex items-center gap-1">
                        <span className="font-medium"></span>
                        {roleIconMap[request.role]}
                      </div>
                      <div className="text-gray-400 text-xs">
                        {request.email}
                      </div>
                      <div className="text-gray-500 text-xs">
                        {request.userId ? '' : 'まだ招待を承諾していません'}
                      </div>
                    </div>
                  </div>
                  {/* 右側ボタン */}
                  <div className="flex gap-2">
                    {canReject(request.status) && (
                      <Button
                        className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded"
                        onClick={() => decideRequest(request.id, 'rejected')}
                        disabled={request.userId === user.id}
                      >
                        拒否
                      </Button>
                    )}
                    {canApprove(request.status) && (
                      <Button
                        className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded"
                        onClick={() => decideRequest(request.id, 'approved')}
                        disabled={request.userId === user.id}
                      >
                        承認
                      </Button>
                    )}
                    {canCancel(request.status) && (
                      <Button
                        className="px-3 py-1 bg-gray-500 hover:bg-gray-600 text-white rounded"
                        onClick={() => decideRequest(request.id, 'none')}
                        disabled={request.userId === user.id}
                      >
                        取り消し
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        }
        footer={
          <>
            {space?.invitationToken && (
              <>
                <Button
                  className="px-3 py-1 bg-gray-500 hover:bg-gray-600 text-white rounded"
                  onClick={async () => {
                    await navigator.clipboard.writeText(
                      `${window.location.origin}/space/invite/${space.invitationToken}`
                    )
                    alert('招待リンクをコピーしました')
                  }}
                >
                  招待リンク
                </Button>
                {
                  inviteNewMembers &&
                  <Button
                    className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded"
                    onClick={() => setInviteFormOpen(true)}
                  >
                    招待する
                  </Button>
                }
              </>
            )}
          </>
        }
      />
      <ConfirmModal
        open={inviteFormOpen}
        onClose={async () => {
          setInviteFormOpen(false)
        }}
        title="メンバーを招待"
        body={<InviteForm value={members} onChange={setInvitees} />}
        footer={
          <>
            {space?.invitationToken && (
              <>
                <Button
                  className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded"
                  onClick={handleSubmit}
                >
                  決定
                </Button>
              </>
            )}
          </>
        }
      />
    </>
  )
}
