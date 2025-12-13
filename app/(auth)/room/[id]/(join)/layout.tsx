import { ApiFetchError } from '@/lib/api/base-client/base-client'
import { roomRepositoryServer } from '@/lib/repositories/server/room.repository.server'
import { notFound } from 'next/navigation'
import { LobbyProvider } from './lobby-provider'
import { SignalingProvider } from './signaling-provider'
import output from '@/config'

export default async function RoomAuthLayout({
  children,
  params
}: {
  children: React.ReactNode
  params: { id: string }
}) {
  const _params = await params
  const id = String(_params.id)
  try {
    const lobby = await roomRepositoryServer.enterLobby(id)
    return (
      <LobbyProvider initialLobby={lobby}>
        <SignalingProvider url={`${output.signalingOrigin}/ws/live/${id}`}>
          {children}
        </SignalingProvider>
      </LobbyProvider>
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
