'use client'

import { useRouter } from "next/navigation";

export default function Invite({ invitation }: { invitation: { space: { id: string; name?: string;  }, redirect: string } }) {
  const router = useRouter()
  router.push(invitation.redirect)
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center p-4 z-10">
      <div className="relative bg-gray-900 rounded-2xl shadow-xl w-full max-w-md p-10 text-white">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-center mb-6">
            招待を受け付けました
          </h2>
          <div className="space-y-3 max-h-60 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-800">
            <div className="mb-4">{invitation.space.name}スペースの招待を受け付けました。スペースページへリダイレクトします。</div>
          </div>
        </div>
      </div>
    </div>
  )
}
