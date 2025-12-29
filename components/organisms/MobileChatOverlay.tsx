export type ChatMessage = {
  id: string
  user: {
    id: string
    name: string
    email: string
    image: string
  }
  text: string
  createdAt: Date
}

export default function MobileChatOverlay({
  messages
}: {
  messages: ChatMessage[]
}) {
  return (
    <div
      className="
        pointer-events-none
        fixed
        bottom-[120px]
        left-2
        w-[75%]
        max-h-[40vh]
        flex flex-col justify-end
        gap-1.5
        z-20
      "
    >
      {messages.slice(-5).map((m) => (
        <div
          key={m.id}
          className="
            flex items-center gap-2
            bg-black/45 backdrop-blur-sm
            rounded-lg
            px-2.5 py-1.5
            text-xs text-white
            shadow-md
          "
        >
          {/* avatar */}
          <img
            src={m.user.image}
            alt={m.user.name}
            className="w-6 h-6 rounded-full object-cover shrink-0"
          />

          {/* text */}
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <span className="font-semibold truncate max-w-[8rem]">
                {m.user.name}
              </span>
            </div>
            <div className="leading-snug line-clamp-2 opacity-90">{m.text}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
