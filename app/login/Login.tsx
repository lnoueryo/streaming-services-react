'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import AuthService from '@/lib/auth/auth.service'
import { authRepositoryClient } from '@/lib/repositories/client/auth.repository.client'
import Button from '../../components/atoms/Button'
import { useLoading } from '@/app/LoadingContext'
import { logger } from '@/lib/logger'

export default function Login({ next }: { next: string }) {
  const { startLoading, endLoading } = useLoading()
  const router = useRouter()
  const [error, setError] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleEmailLogin = async (e: any) => {
    e.preventDefault()
    setError('')

    try {
      startLoading()
      const user = await AuthService.signInWithEmail(email, password)
      router.push(next)
    } catch (err: any) {
      logger.error(err)
      setError('ログインに失敗しました')
    } finally {
      endLoading()
    }
  }

  const googleLogin = async () => {
    setError('')

    try {
      startLoading()
      const user = await AuthService.signInWithGoogle()
      await authRepositoryClient.login(user.idToken)
      logger.debug('Login', 'Google Login OK', user)
      router.push(next)
    } catch (err) {
      logger.error(err)
      setError('Googleログインに失敗しました')
    } finally {
      endLoading()
    }
  }

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

        <Button type="submit" className="bg-blue-600 text-white p-2 rounded">
          ログイン
        </Button>
      </form>

      <Button
        onClick={googleLogin}
        className="bg-red-600 text-white p-2 rounded"
      >
        Googleでログイン
      </Button>
    </div>
  )
}
