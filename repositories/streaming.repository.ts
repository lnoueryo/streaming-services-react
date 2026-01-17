import { BaseClient } from '@/lib/api/base-client/base-client'

export type TurnCredential = {
  username: string
  credential: string
  ttl: number
  urls: string[]
}

export type Video = {
  roomId: string
  recordingId: string
  size: number
  createdAt: string
  hlsUrl: string
  thumbnailUrl: string
}

export class StreamingRepository {
  constructor(private client: BaseClient) {}
  public async generateTurnCredential(): Promise<TurnCredential> {
    const res = await this.client.post('/streaming/turn/generate')
    return res && (await res.json())
  }
  public async getVideos(roomId: string): Promise<{ videos: Video[] }> {
    const res = await this.client.get(`/streaming/space/${roomId}`)
    return res && (await res.json())
  }
  public async deleteVideo(roomId: string, recordingId: string): Promise<void> {
    await this.client.delete(`/streaming/space/${roomId}/${recordingId}`)
    return
  }
}
