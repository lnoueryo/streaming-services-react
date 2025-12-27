// components/organisms/Chat/ChatPanel.tsx
'use client'

import { motion, AnimatePresence } from 'framer-motion'
import ChatMessageList from './ChatMessageList'
import ChatInput from './ChatInput'

export default function ChatPanel({
  open,
  onClose,
  messages,
  onSend,
}: {
  open: boolean
  onClose: () => void
  messages: any[]
  onSend: (text: string) => void
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ x: 360 }}
          animate={{ x: 0 }}
          exit={{ x: 360 }}
          transition={{ type: 'tween', duration: 0.25 }}
          className="
            hidden md:flex
            fixed top-0 right-0
            w-[360px] h-full
            bg-black/80 backdrop-blur-md
            border-l border-white/10
            z-40
            flex flex-col
          "
        >
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-white/10">
            <span className="text-white font-semibold">チャット</span>
            <button onClick={onClose} className="text-white/70">✕</button>
          </div>

          <ChatMessageList messages={messages} />

          <ChatInput onSend={onSend} />
        </motion.div>
      )}
    </AnimatePresence>
  )
}