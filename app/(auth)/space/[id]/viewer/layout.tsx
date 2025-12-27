import { ApiFetchError } from '@/lib/api/base-client/base-client'
import { spaceRepositoryServer } from '@/lib/repositories/server/space.repository.server'
import { forbidden, notFound } from 'next/navigation'
import { SignalingProvider } from '../signaling-provider'
import output from '@/config'
import { logger } from '@/lib/logger'
import { SpaceMemberProvider } from './space-member-provider'

export default async function ViewerLayout({
  children,
  params
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  try {
    const space = await spaceRepositoryServer.getTargetSpace(id)
    return (
      <SpaceMemberProvider initialSpace={space}>
        <SignalingProvider
          url={`${output.signalingOrigin}/ws/live/${id}/viewer`}
        >
          {children}
        </SignalingProvider>
      </SpaceMemberProvider>
    )
  } catch (error) {
    if (error instanceof ApiFetchError) {
      if (error.statusCode === 403) {
        return forbidden()
      }
      if (error.statusCode === 404) {
        return notFound()
      }
    }
    logger.error(error)
    throw error
  }
}
