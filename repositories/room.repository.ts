import { api } from '@/lib/api/client';

export async function fetchPublicRooms(params: { page: number, limit: number }): Promise<Rooms> {
  const res = await api.get(`/rooms/public`, params)
  return await res.json();
}

export async function checkRoomJoinable(id: string): Promise<Rooms> {
  const res = await api.get(`/rooms/${id}/join`)
  return await res.json();
}

export async function createRoom(): Promise<Room> {
  const res =  await api.post(`/rooms/create`, {});
  return await res.json();
}

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