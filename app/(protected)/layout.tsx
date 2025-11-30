'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthService from '@/lib/auth/auth.service';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const unsub = AuthService.onAuthStateChanged((user) => {
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