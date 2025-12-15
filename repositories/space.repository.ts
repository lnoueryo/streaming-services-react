import { BaseClient } from '@/lib/api/base-client/base-client'

type SpacePrivacy = 'public'  | 'protected' | 'private'

export type RoomResponse = Pick<SpaceResponse, 'id' | 'privacy'> & {
  participants: {
    id: string
    name: string
    email: string
    image: string
  }[]
  isJoined: boolean
}

export type SpaceResponse = {
  id: string
  privacy: SpacePrivacy
}

export type SpacesResponse = {
  items: SpaceResponse[]
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

  public async enterLobby(id: string): Promise<RoomResponse> {
    const res = await this.client.get(`/spaces/${id}/lobby`)
    return res && (await res.json())
  }

  public async enableEntry(
    id: string,
    params?: { force: boolean }
  ): Promise<RoomResponse> {
    const res = await this.client.patch(`/spaces/${id}/enable`, params)
    return res && (await res.json())
  }

  public async createSpace(params: CreateSpacePayload): Promise<SpaceResponse> {
    const res = await this.client.post(`/spaces`, params)
    return res && (await res.json())
  }
}
