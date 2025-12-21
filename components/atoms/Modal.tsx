'use client'

import { AnimatePresence, motion } from 'framer-motion'

type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
type ModalZIndex = 'low' | 'normal' | 'high' | 'max'

const sizeClassMap: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  full: 'max-w-none w-screen h-screen rounded-none'
}

const zIndexClassMap: Record<ModalZIndex, string> = {
  low: 'z-30',
  normal: 'z-50',
  high: 'z-[70]',
  max: 'z-[999]'
}

export default function Modal({
  open,
  onClose,
  persistent,
  size = 'lg',
  zIndex = 'normal',
  children
}: {
  open: boolean
  onClose: () => void
  persistent?: boolean
  size?: ModalSize
  zIndex?: ModalZIndex
  children: React.ReactNode
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={`
            fixed inset-0 bg-black/50 flex items-center justify-center
            ${zIndexClassMap[zIndex]}
          `}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={persistent ? undefined : onClose}
        >
          <motion.div
            className={`
              bg-gray-800 text-white rounded-lg p-6 shadow-xl w-full
              ${sizeClassMap[size]}
            `}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}