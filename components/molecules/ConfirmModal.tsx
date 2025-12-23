import { ReactNode } from 'react'
import Modal from '@/components/atoms/Modal'

type ConfirmModalProps = {
  open: boolean
  onClose: () => void

  title?: ReactNode
  message?: ReactNode
  body?: ReactNode
  footer?: ReactNode

  persistent?: boolean
  zIndex?: 'max' | number
}

export function ConfirmModal({
  open,
  onClose,
  title,
  message,
  body,
  footer,
  persistent = false,
  zIndex = 'max',
}: ConfirmModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      persistent={persistent}
      z-index={zIndex}
    >
      <div className="relative min-w-[300px]">
        {/* ✕ Close Button */}
        {!persistent && (
          <button
            onClick={onClose}
            className="
              absolute top-1 right-2
              text-gray-400 hover:text-gray-600
              transition
            "
            aria-label="close"
          >
            ✕
          </button>
        )}

        {title && (
          <h2 className="text-lg font-semibold mb-4">
            {title}
          </h2>
        )}

        {message && (
          <p className="mb-4 text-sm">
            {message}
          </p>
        )}

        {body && (
          <div className="mb-4">
            {body}
          </div>
        )}

        {footer && (
          <div className="flex justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </Modal>
  )
}