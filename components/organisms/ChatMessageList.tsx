type ChatMessage = {
  id: string
  user: {
    id: string
    name: string
    image?: string
    role?: 'owner' | 'admin' | 'member'
  }
  text: string
  createdAt: Date
}

export default function ChatMessageList({
  messages
}: {
  messages: ChatMessage[]
}) {
  return (
    <div
      className="
        flex-1 overflow-y-auto
        px-3 py-2
        space-y-2
        scrollbar-thin scrollbar-thumb-white/20
      "
    >
      {messages.map((m) => (
        <div key={m.id} className="flex items-start gap-2 text-sm text-white">
          {/* avatar（PCでは見せる／モバイルでも小さく） */}
          {m.user.image && (
            <img
              src={m.user.image}
              alt={m.user.name}
              className="w-7 h-7 rounded-full object-cover shrink-0"
            />
          )}

          {/* message body */}
          <div className="min-w-0">
            {/* header */}
            <div className="flex items-center gap-1">
              <span className="font-semibold truncate max-w-[10rem]">
                {m.user.name}
              </span>

              {/* role badge（将来用） */}
              {m.user.role === 'owner' && (
                <span className="text-[10px] text-yellow-400">★</span>
              )}
              {m.user.role === 'admin' && (
                <span className="text-[10px] text-blue-400">◆</span>
              )}
            </div>

            {/* text */}
            <div className="whitespace-pre-wrap break-words leading-snug text-white/90">
              {m.text}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
