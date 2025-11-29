'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AuthService from '@/lib/auth/auth.service';

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [next, setNext] = useState('/');

  useEffect(() => {
    const next = params.get('next') || '/';
    setNext(next);
    AuthService.onAuthStateChanged((user) => {
      if (user) {
        router.replace(next);
      } else {
        setChecking(false);
      }
    });
  }, [router]);

  // ⭐ 認証状態チェック中なら一瞬ローディング
  if (checking) {
    return <div className="text-center mt-20">Loading...</div>;
  }

  const handleEmailLogin = async (e: any) => {
    e.preventDefault();
    setError('');

    try {
      const user = await AuthService.signInWithEmail(email, password);
      console.log('Login OK', user);
      router.push(next);
    } catch (err: any) {
      console.error(err);
      setError('ログインに失敗しました');
    }
  };

  const googleLogin = async () => {
    setError('');

    try {
      const user = await AuthService.signInWithGoogle();
      console.log('Google Login OK', user);
      router.push(next);
    } catch (err) {
      console.error(err);
      setError('Googleログインに失敗しました');
    }
  };

  return (
    <div className="max-w-sm mx-auto mt-20 flex flex-col gap-4">
      {error && (
        <div className="bg-red-100 text-red-700 p-2 rounded">{error}</div>
      )}

      <form onSubmit={handleEmailLogin} className="flex flex-col gap-2">
        <input
          className="border p-2 rounded"
          type="email"
          placeholder="メールアドレス"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          className="border p-2 rounded"
          type="password"
          placeholder="パスワード"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          type="submit"
          className="bg-blue-600 text-white p-2 rounded"
        >
          ログイン
        </button>
      </form>

      <button
        onClick={googleLogin}
        className="bg-red-600 text-white p-2 rounded"
      >
        Googleでログイン
      </button>
    </div>
  );
}