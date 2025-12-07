import { BaseClient } from '@/lib/api/base-client/base-client';

export type TurnCredential = {
  username: string
  credential: string
  ttl: number
  urls: string[]
}

export class SignalingRepository {
  constructor(private client: BaseClient) {}
  public async generateTurnCredential(): Promise<TurnCredential> {
    const res =  await this.client.post('/streaming/turn/generate');
    return await res.json();
  }
}
