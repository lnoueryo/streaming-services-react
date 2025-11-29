import { api } from '@/lib/api/client';

export async function generateTurnCredential(): Promise<TurnCredential> {
  const res =  await api.post('/streaming/turn/generate');
  return await res.json();
}
export type TurnCredential = {
  username: string
  credential: string
  ttl: number
  urls: string[]
}