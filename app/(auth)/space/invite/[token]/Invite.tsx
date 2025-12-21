'use client'

import Button from "@/components/atoms/Button";
import output from "@/config"
import Link from "next/link"

export default function Invite({ invitation }: { invitation: { space: { id: string; name?: string;  }, redirect: string } }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center p-4 z-10">
      <div className="relative bg-gray-900 rounded-2xl shadow-xl w-full max-w-md p-10 text-white">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-center mb-6">
            招待を受け付けました
          </h2>
          <div className="space-y-3 max-h-60 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-800">
            <div className="mb-4">{invitation.space.name}スペースの招待を受け付けました。下記URLよりスペースに参加できます。</div>
            <Link className="text-blue-700 rounded break-all" href={invitation.redirect}>{output.streamingApiFrontendOrigin}{invitation.redirect}</Link>
          </div>
        </div>
          <div className="flex items-center justify-end gap-2">
            <Button
              className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
            >
              閉じる
            </Button>
            <Button
              onClick={() => location.href = invitation.redirect}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-900"
            >
              参加する
            </Button>
          </div>
      </div>
    </div>
  )
}
