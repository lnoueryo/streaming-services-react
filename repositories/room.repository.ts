import { BaseClient } from '@/lib/api/base-client/base-client';

export type Room = {
  id: string
  privacy: string
}

export type Rooms = {
  items: Room[]
    page: number
    limit: number
    total: number
    totalPages: number
}

export class RoomRepository {
  constructor(private client: BaseClient) {}
  public async fetchPublicRooms(params: { page: number, limit: number }): Promise<Rooms> {
    const res = await this.client.get(`/rooms/public`, params)
    return await res.json();
  }

  public async joinRoom(id: string): Promise<Rooms> {
    const res = await this.client.put(`/rooms/${id}/join`)
    return await res.json();
  }

  public async rejoinRoom(id: string): Promise<Rooms> {
    const res = await this.client.put(`/rooms/${id}/join/replace`)
    return await res.json();
  }

  public async createRoom(): Promise<Room> {
    const res =  await this.client.post(`/rooms/create`, {});
    return await res.json();
  }
}