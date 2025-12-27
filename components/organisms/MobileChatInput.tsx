import { useState } from "react"

// MobileChatInput.tsx
export default function MobileChatInput({
  onSend,
}: {
  onSend: (text: string) => void
}) {
  const [text, setText] = useState('')
  const [isComposing, setIsComposing] = useState(false)
  return (
    <div
      className="
        fixed bottom-0 left-0 right-0
        z-30
        bg-black/60 backdrop-blur-md
        px-2 py-2
        flex gap-2
        md:hidden
      "
    >
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
          flex-1
          bg-black/60
          text-white text-sm
          rounded px-3 py-2
          outline-none
        "
        placeholder="コメントを入力"
      />
      <button
        onClick={() => {
          onSend(text)
          setText('')
        }}
        className="text-white px-3"
      >
        送信
      </button>
    </div>
  )
}