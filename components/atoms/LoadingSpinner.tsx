type LoadingSpinnerProps = {
  size?: number
  color?: string
  className?: string
}

export function LoadingSpinner({
  size = 24,
  color = 'border-gray-300 border-t-gray-600',
  className = ''
}: LoadingSpinnerProps) {
  return (
    <div
      className={`
        inline-block
        animate-spin
        rounded-full
        border-2
        ${color}
        ${className}
      `}
      style={{
        width: size,
        height: size
      }}
    />
  )
}
