'use client'

import Button from '@/components/atoms/Button'
import { ConfirmModal } from '@/components/molecules/ConfirmModal'
import { SpaceMember } from '@/repositories/space-member.repository'
import { useUser } from '@/app/(auth)/user-provider'

export default function EntryRequest({
  request,
  setEntryRequests,
  setRequestList,
  decideRequest
}: {
  request: SpaceMember
  setEntryRequests: React.Dispatch<React.SetStateAction<SpaceMember[]>>
  setRequestList: React.Dispatch<React.SetStateAction<SpaceMember[]>>
  decideRequest: (
    memberId: number,
    status: 'none' | 'approved' | 'rejected'
  ) => Promise<void>
}) {
  const user = useUser()

  return (
    <ConfirmModal
      open={!!request}
      onClose={() => {
        setEntryRequests((prev) =>
          prev.filter((r) => r.userId !== request.userId)
        )
        setRequestList((prev) => {
          if (prev.some((r) => r.id !== request.id)) {
            return [...prev, request]
          }
          return prev.map((r) => {
            if (r.id === request.id) {
              return {
                ...r,
                status: request.status
              }
            }
            return r
          })
        })
      }}
      title="入室のリクエスト"
      message={`${request.email} が入室をリクエストしています。`}
      footer={
        <>
          <Button
            className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded"
            onClick={async () => {
              decideRequest(request.id, 'rejected')
              setEntryRequests((prev) =>
                prev.filter((r) => r.userId !== request.userId)
              )
            }}
          >
            拒否
          </Button>
          <Button
            className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded"
            onClick={async () => {
              decideRequest(request.id, 'approved')
              setEntryRequests((prev) =>
                prev.filter((r) => r.userId !== request.userId)
              )
            }}
          >
            承認
          </Button>
        </>
      }
    />
  )
}
