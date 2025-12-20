import output from '@/config'
import { ClientFetch } from '@/lib/api/base-client/client-fetch'
import { SpaceMemberRepository } from '@/repositories/space-member.repository'

const clientFetch = new ClientFetch(output.streamingBackendApiOrigin.client)
export const spaceMemberRepositoryClient = new SpaceMemberRepository(clientFetch)
