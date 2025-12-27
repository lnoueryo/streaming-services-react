import { useState } from 'react'
import { SpaceMember } from '@/repositories/space-member.repository'
import { spaceMemberRepositoryClient } from '@/lib/repositories/client/space-member.repository.client'
import { TargetSpaceResponse } from '@/repositories/space.repository'

export default function useSpaceMember(space: {
  id: string
  name?: string
  privacy: 'public' | 'protected' | 'private'
  spaceMembers?: SpaceMember[]
}) {
  const [requestList, setRequestList] = useState<SpaceMember[]>(
    space.spaceMembers || []
  )
  const [requestModalOpen, setRequestModalOpen] = useState(false)
  const [requestLoading, setRequestLoading] = useState(false)
  const pendingCount = requestList.filter(
    (r: SpaceMember) => r.status === 'pending'
  ).length

  const decideRequest = async (
    spaceMemberId: number,
    status: 'none' | 'approved' | 'rejected'
  ) => {
    try {
      const spaceMember = await spaceMemberRepositoryClient.decideRequest(
        space.id,
        spaceMemberId,
        {
          status
        }
      )
      setRequestList((prev) => {
        return prev.map((r) => {
          if (r.id === spaceMember.id) {
            return {
              ...r,
              status: spaceMember.status
            }
          }
          return r
        })
      })
    } catch (error) {
      alert('予期せぬエラーが発生しました')
    }
  }

  const fetchSpaceMembers = async () => {
    setRequestLoading(true)
    try {
      const { spaceMembers } =
        await spaceMemberRepositoryClient.fetchSpaceMembers(space.id)
      console.log('fetchSpaceMembers result:', spaceMembers)
      setRequestList(spaceMembers)
    } catch (error) {
      alert('予期せぬエラーが発生しました')
    } finally {
      setRequestLoading(false)
    }
  }

  const inviteNewMembers = async (
    members: { email: string; role: 'member' | 'admin' }[]
  ) => {
    const { spaceMembers } = await spaceMemberRepositoryClient.inviteMembers(
      space.id,
      {
        members: members.filter((i) => i.email.trim() !== '')
      }
    )
    spaceMembers.forEach((member) => {
      if (requestList.some((r) => r.id === member.id)) {
        setRequestList((prev) =>
          prev.map((r) => {
            if (r.id === member.id) {
              return member
            }
            return r
          })
        )
      }
    })
    return spaceMembers
  }
  return {
    decideRequest,
    fetchSpaceMembers,
    inviteNewMembers,
    requestList,
    requestModalOpen,
    setRequestList,
    setRequestModalOpen,
    requestLoading,
    pendingCount
  }
}
