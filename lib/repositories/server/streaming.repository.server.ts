import output from '@/config'
import { ServerFetch } from '@/lib/api/base-client/server-fetch'
import { StreamingRepository } from '@/repositories/streaming.repository'
const serverFetch = new ServerFetch(output.streamingBackendApiOrigin.server)
export const streamingRepositoryServer = new StreamingRepository(serverFetch)
