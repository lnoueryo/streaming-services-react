'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthService from '@/lib/auth/auth.service';
import { fetchPublicRooms } from '@/repositories/room.repository';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  useEffect(() => {
    const unsub = AuthService.onAuthStateChanged(async(user) => {
      if (!user) {
        router.replace(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      } else {
        setChecked(true);
      }
    });
    return () => unsub();
  }, []);

  if (!checked) return null; // チェック中は描画しない

  return <>{children}</>;
}