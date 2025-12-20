import { BaseClient } from "@/lib/api/base-client/base-client"

type SpaceMemberRole = 'owner' | 'admin' | 'member'
type SpaceMemberStatus = 'none' | 'pending' | 'approved' | 'rejected'

export type SpaceMember = {
  id: number
  spaceId: string
  userId: string
  email: string
  role: SpaceMemberRole
  status: SpaceMemberStatus
}

export class SpaceMemberRepository {
  constructor(private client: BaseClient) {}

  public async requestEntry(spaceId: string): Promise<void> {
    await this.client.patch(`/space-members/${spaceId}/request`)
    return
  }

  public async decideRequest(
    spaceId: string,
    spaceMemberId: number,
    payload: { status: 'approved' | 'rejected' }
  ): Promise<{
    id: number
    role: SpaceMemberStatus
    status: 'approved' | 'rejected'
  }> {
    const res = await this.client.patch(`/space-members/${spaceId}/request/${spaceMemberId}/decide`, payload)
    return res && (await res.json())
  }

}
