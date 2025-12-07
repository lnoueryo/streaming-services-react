import { ApiFetchError } from '@/lib/api/base-client/base-client';
import { roomRepositoryServer } from '@/lib/repositories/server/room.repository.server';
import { notFound } from 'next/navigation';

export default async function RoomAuthLayout({ children, params }: { children: React.ReactNode, params: { id: string } }) {
  // const [checked, setChecked] = useState(false);
  const _params = await params
  const id = String(_params.id)
  try {
    const room = await roomRepositoryServer.joinRoom(id)
    console.log(room)
  } catch (error) {
    console.log(error)
    if (error instanceof ApiFetchError) {
      if (error.statusCode === 404) {
        return notFound()
      }
      // if (error.statusCode === 409) {
      //   const ok = confirm('別の端末で既に参加しているようです。こちらの端末に切り替えますか。')
      //   if (ok) {
      //     try {
      //       await roomRepository.rejoinRoom(id)
      //     } catch (error) {
      //       if (error instanceof ApiFetchError) {
      //         alert(error.message)
      //       }
      //       alert('予期せぬエラーが発生しました')
      //     }
      //   }
      // }
    }
  }

  return <>{children}</>;
}