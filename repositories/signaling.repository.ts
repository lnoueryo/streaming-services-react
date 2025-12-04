import { Client } from '@/lib/api/client';
import { signalingApi } from '@/lib/api/signaling-api';

export type TurnCredential = {
  username: string
  credential: string
  ttl: number
  urls: string[]
}

class SignalingRepository {
  constructor(private client: Client) {}
  public async generateTurnCredential(): Promise<TurnCredential> {
    const res =  await this.client.post('/streaming/turn/generate');
    return await res.json();
  }
}

export const signalingRepository = new SignalingRepository(signalingApi)
