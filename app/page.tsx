'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthService from '@/lib/auth/auth.service';
import type { AuthUser } from '@/lib/auth/types';

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checking, setChecking] = useState(true);

  // 🔐 認証チェック（未ログイン → /login）
  useEffect(() => {
    AuthService.onAuthStateChanged((u: AuthUser | null) => {
      if (!u) {
        router.replace('/login');
      } else {
        setUser(u);
        setChecking(false);
      }
    });
  }, [router]);

  if (checking) {
    return <div className="text-center mt-20">Loading...</div>;
  }

  const handleCreateRoom = () => {
    router.push('/room/new');
  };

  const handleLogout = async () => {
    await AuthService.signOut();
    router.replace('/login');
  };

  return (
    <div className="max-w-lg mx-auto mt-20 flex flex-col gap-4 text-center">
      <h1 className="text-2xl font-bold">ホーム</h1>

      <p className="text-gray-700">
        ログイン中：{user?.email || 'No email'}
      </p>

      <button
        onClick={handleCreateRoom}
        className="bg-blue-600 text-white p-3 rounded"
      >
        ルーム作成
      </button>

      <button
        onClick={handleLogout}
        className="bg-gray-700 text-white p-3 rounded"
      >
        ログアウト
      </button>
    </div>
  );
}