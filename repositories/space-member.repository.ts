import { BaseClient } from '@/lib/api/base-client/base-client'

type SpaceMemberRole = 'owner' | 'admin' | 'member'
type SpaceMemberStatus = 'none' | 'pending' | 'approved' | 'rejected'

export type SpaceMember = {
  id: number
  spaceId: string
  userId: string
  email: string
  role: SpaceMemberRole
  status: SpaceMemberStatus
  joinedAt: SpaceMemberStatus
}

export type SpaceUser = SpaceMember & {
  name: string
  image: string
}
export class SpaceMemberRepository {
  constructor(private client: BaseClient) {}

  public async requestEntry(spaceId: string): Promise<{
    role: SpaceMemberRole
    status: SpaceMemberStatus
  }> {
    const res = await this.client.patch(`/space-members/${spaceId}/request`)
    return res && (await res.json())
  }

  public async decideRequest(
    spaceId: string,
    spaceMemberId: number,
    payload: { status: 'none' | 'approved' | 'rejected' }
  ): Promise<{
    id: number
    role: SpaceMemberStatus
    status: 'approved' | 'rejected'
  }> {
    const res = await this.client.patch(
      `/space-members/${spaceId}/request/${spaceMemberId}/decide`,
      payload
    )
    return res && (await res.json())
  }

  public async fetchSpaceMembers(spaceId: string): Promise<{
    spaceMembers: SpaceUser[]
  }> {
    const res = await this.client.get(`/space-members/${spaceId}`)
    return res && (await res.json())
  }

  public async inviteMembers(
    spaceId: string,
    members: { members: { email: string; role: 'member' | 'admin' }[] }
  ): Promise<{
    spaceMembers: SpaceUser[]
  }> {
    const res = await this.client.post(`/spaces/invite/${spaceId}`, members)
    return res && (await res.json())
  }
}
