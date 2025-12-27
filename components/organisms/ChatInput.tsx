// components/organisms/Chat/ChatInput.tsx
import { useState } from 'react'

export default function ChatInput({
  onSend,
}: {
  onSend: (text: string) => void
}) {
  const [text, setText] = useState('')
  const [isComposing, setIsComposing] = useState(false)

  const send = () => {
    if (!text.trim()) return
    onSend(text)
    setText('')
  }

  return (
    <div className="p-2 border-t border-white/10 flex gap-2">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onCompositionStart={() => setIsComposing(true)}
        onCompositionEnd={() => setIsComposing(false)}
        onKeyDown={(e) => {
          // IME変換中はEnterで送信しない
          if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
            e.preventDefault()
            onSend(text)
            setText('')
          }
        }}
        className="
          flex-1 bg-black/60
          text-white text-sm
          rounded px-3 py-2
          outline-none
        "
        placeholder="メッセージを入力"
      />
      <button
        onClick={send}
        className="text-white px-3 text-sm"
      >
        送信
      </button>
    </div>
  )
}