import output from '@/config'
import { ClientFetch } from '@/lib/api/base-client/client-fetch'
import { StreamingRepository } from '@/repositories/streaming.repository'
const clientFetch = new ClientFetch(output.streamingBackendApiOrigin.client)
export const signalingRepositoryClient = new StreamingRepository(clientFetch)
