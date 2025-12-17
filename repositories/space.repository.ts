import { BaseClient } from '@/lib/api/base-client/base-client'
import { SpaceMember } from './space-member.repository'

type SpacePrivacy = 'public'  | 'protected' | 'private'

export type Room = {
  participants: {
    id: string
    name: string
    email: string
    image: string
  }[]
  isParticipated: boolean
}

export type Space = {
  id: string
  privacy: SpacePrivacy
  membership: {
    role: SpaceMember['role']
    status: SpaceMember['status']
  }
}

export type SpaceResponse = Pick<Space, 'id' | 'privacy' | 'membership'> & {
  participants: {
    id: string
    name: string
    email: string
    image: string
  }[]
  isParticipated: boolean
}


export type SpacesResponse = {
  items: Space[]
  page: number
  limit: number
  total: number
  totalPages: number
}

export type CreateSpacePayload = {
  name?: string
  privacy: SpacePrivacy
  members?: { email: string; role: "member" | "protected" | "admin" }[]
}


export class SpaceRepository {
  constructor(private client: BaseClient) {}
  public async fetchPublicSpaces(params: {
    page: number
    limit: number
  }): Promise<SpacesResponse> {
    const res = await this.client.get(`/spaces/public`, params)
    return res && (await res.json())
  }

  public async enterLobby(id: string): Promise<SpaceResponse> {
    const res = await this.client.get(`/spaces/${id}/lobby`)
    return res && (await res.json())
  }

  public async enableEntry(
    id: string,
    params?: { force: boolean }
  ): Promise<SpaceResponse> {
    const res = await this.client.patch(`/spaces/${id}/enable`, params)
    return res && (await res.json())
  }

  public async createSpace(params: CreateSpacePayload): Promise<Space> {
    const res = await this.client.post(`/spaces`, params)
    return res && (await res.json())
  }
}
