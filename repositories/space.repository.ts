import { BaseClient } from '@/lib/api/base-client/base-client'

export type LobbyResponse = SpaceResponse & {
  isJoined: boolean
}

export type SpaceResponse = {
  id: string
  privacy: string
  users: {
    id: string
    name: string
    email: string
    image: string
  }[]
}

export type SpacesResponse = {
  items: SpaceResponse[]
  page: number
  limit: number
  total: number
  totalPages: number
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

  public async enterLobby(id: string): Promise<LobbyResponse> {
    const res = await this.client.get(`/spaces/${id}/lobby`)
    return res && (await res.json())
  }

  public async enterRoom(
    id: string,
    params?: { force: boolean }
  ): Promise<LobbyResponse> {
    const res = await this.client.patch(`/spaces/${id}/room`, params)
    return res && (await res.json())
  }

  public async createSpace(): Promise<SpaceResponse> {
    const res = await this.client.post(`/spaces/create`, {})
    return res && (await res.json())
  }
}
