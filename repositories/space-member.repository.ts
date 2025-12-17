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
