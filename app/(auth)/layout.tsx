'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthService from '@/lib/auth/auth.service';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ok, setOk] = useState(false);

  useEffect(() => {
    const unsub = AuthService.onAuthStateChanged(user => {
      if (!user) {
        router.replace(`/login?next=${window.location.pathname}`);
      } else {
        setOk(true);
      }
    });

    return () => unsub();
  }, []);

  if (!ok) return null;
  return <>{children}</>;
}