import { useState } from 'react'

export default function Button({
  onClick,
  children,
  className = '',
  loading = false,
  type = 'button'
}: {
  onClick?: () => void
  children: React.ReactNode
  className?: string
  loading?: boolean
  type?: 'button' | 'submit' | 'reset'
}) {
  const [isLoading, setIsLoading] = useState(false)

  const handleClick = async () => {
    if (loading) {
      setIsLoading(true)
    }
    try {
      await onClick?.()
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      type={type}
      className={`
        flex items-center justify-center
        ${className}
        disabled:opacity-60 disabled:cursor-not-allowed
      `}
      disabled={isLoading}
    >
      {isLoading ? (
        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
      ) : (
        children
      )}
    </button>
  )
}
