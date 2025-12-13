import { ApiFetchError } from '@/lib/api/base-client/base-client'
import { spaceRepositoryServer } from '@/lib/repositories/server/space.repository.server'
import { notFound } from 'next/navigation'
import { RoomProvider } from './room-provider'
import { SignalingProvider } from './signaling-provider'
import output from '@/config'

export default async function SpaceAuthLayout({
  children,
  params
}: {
  children: React.ReactNode
  params: { id: string }
}) {
  const _params = await params
  const id = String(_params.id)
  try {
    const room = await spaceRepositoryServer.enterLobby(id)
    return (
      <RoomProvider initialRoom={room}>
        <SignalingProvider url={`${output.signalingOrigin}/ws/live/${id}`}>
          {children}
        </SignalingProvider>
      </RoomProvider>
    )
  } catch (error) {
    console.log(error)
    if (error instanceof ApiFetchError) {
      if (error.statusCode === 404) {
        return notFound()
      }
    }
    throw error
  }
}
