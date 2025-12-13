import { BaseClient } from '@/lib/api/base-client/base-client';

export type LobbyResponse = RoomResponse & {
  isJoined: boolean
}

export type RoomResponse = {
  id: string
  privacy: string
  users: {
    id: string
    name: string
    email: string
    image: string
  }[]
}

export type RoomsResponse = {
  items: RoomResponse[]
    page: number
    limit: number
    total: number
    totalPages: number
}

export class RoomRepository {
  constructor(private client: BaseClient) {}
  public async fetchPublicRooms(params: { page: number, limit: number }): Promise<RoomsResponse> {
    const res = await this.client.get(`/rooms/public`, params)
    return res && await res.json();
  }

  public async enterLobby(id: string): Promise<LobbyResponse> {
    const res = await this.client.get(`/rooms/${id}/lobby`)
    return res && await res.json();
  }

  public async enterRoom(id: string, params?: { force: boolean }): Promise<LobbyResponse> {
    const res = await this.client.patch(`/rooms/${id}/room`, params)
    return res && await res.json();
  }

  public async createRoom(): Promise<RoomResponse> {
    const res =  await this.client.post(`/rooms/create`, {});
    return res && await res.json();
  }
}