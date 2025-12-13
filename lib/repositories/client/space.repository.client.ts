import output from '@/config'
import { ClientFetch } from '@/lib/api/base-client/client-fetch'
import { SpaceRepository } from '@/repositories/space.repository'
const clientFetch = new ClientFetch(output.streamingBackendApiOrigin.client)
export const spaceRepositoryClient = new SpaceRepository(clientFetch)
