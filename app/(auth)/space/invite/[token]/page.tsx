import { ApiFetchError } from '@/lib/api/base-client/base-client'
import { spaceRepositoryServer } from '@/lib/repositories/server/space.repository.server'
import { forbidden, notFound } from 'next/navigation'
import Invite from './Invite'

export default async function InvitationPage({
  params
}: {
  params: { token: string }
}) {
  try {
    const { token } = await params
    const res = await spaceRepositoryServer.acceptInvitation(token)
    return <Invite invitation={res} />
  } catch (error) {
    if (error instanceof ApiFetchError) {
      if (error.statusCode === 403) {
        return forbidden()
      }
      if (error.statusCode === 400 || error.statusCode === 404) {
        return notFound()
      }
    }
    throw error
  }
}
