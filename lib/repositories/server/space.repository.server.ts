import output from '@/config'
import { ServerFetch } from '@/lib/api/base-client/server-fetch'
import { SpaceRepository } from '@/repositories/space.repository'
const serverFetch = new ServerFetch(output.streamingBackendApiOrigin.server)
export const spaceRepositoryServer = new SpaceRepository(serverFetch)
