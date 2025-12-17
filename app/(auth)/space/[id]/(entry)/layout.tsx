import { ApiFetchError } from '@/lib/api/base-client/base-client'
import { spaceRepositoryServer } from '@/lib/repositories/server/space.repository.server'
import { notFound } from 'next/navigation'
import { SpaceProvider } from './space-provider'
import { SignalingProvider } from './signaling-provider'
import output from '@/config'
import { logger } from '@/lib/logger'

export default async function SpaceAuthLayout({
  children,
  params
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const _params = await params
  const id = String(_params.id)
  try {
    const space = await spaceRepositoryServer.enterLobby(id)
    return (
      <SpaceProvider initialSpace={space}>
        <SignalingProvider url={`${output.signalingOrigin}/ws/live/${id}`}>
          {children}
        </SignalingProvider>
      </SpaceProvider>
    )
  } catch (error) {
    if (error instanceof ApiFetchError) {
      if (error.statusCode === 404) {
        return notFound()
      }
    }
    logger.error(error)
    throw error
  }
}
