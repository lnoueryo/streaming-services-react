import { ApiFetchError } from '@/lib/api/base-client/base-client';
import { roomRepositoryServer } from '@/lib/repositories/server/room.repository.server';
import { notFound } from 'next/navigation';
import { LobbyProvider } from './lobby-provider';

export default async function RoomAuthLayout({ children, params }: { children: React.ReactNode, params: { id: string } }) {
  // const [checked, setChecked] = useState(false);
  const _params = await params
  const id = String(_params.id)
  try {
    const lobby = await roomRepositoryServer.enterLobby(id)
    return (
      <LobbyProvider lobby={lobby}>
        {children}
      </LobbyProvider>
    );
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