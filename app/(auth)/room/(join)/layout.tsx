'use client';

import { useEffect, useState } from 'react';
import { notFound, useParams, useRouter } from 'next/navigation';
import { joinRoom, rejoinRoom } from '@/repositories/room.repository';
import { ApiFetchError } from '@/lib/api/client';

export default function RoomAuthLayout({ children }: { children: React.ReactNode, params: { id: string } }) {
  const params = useParams();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const id = String(params.id)
    const start = async () => {
      try {
        const id = String(params.id)
        const room = await joinRoom(id)
        setChecked(true)
      } catch (error) {
        if (error instanceof ApiFetchError) {
          if (error.statusCode === 404) {
            return notFound()
          }
          if (error.statusCode === 409) {
            const ok = confirm('別の端末で既に参加しているようです。こちらの端末に切り替えますか。')
            if (ok) {
              try {
                await rejoinRoom(id)
                setChecked(true)
              } catch (error) {
                if (error instanceof ApiFetchError) {
                  alert(error.message)
                }
                alert('予期せぬエラーが発生しました')
              }
            }
          }
        }
        return
      }
    }
    start()
  }, []);

  if (!checked) return null;
  return <>{children}</>;
}