'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect } from 'react'

export type ToastType = 'info' | 'success' | 'error'

export default function Toast({
  open,
  message,
  type = 'info',
  duration = 3000,
  onClose
}: {
  open: boolean
  message: string
  type?: ToastType
  duration?: number
  onClose: () => void
}) {
  useEffect(() => {
    if (!open) return
    const t = setTimeout(onClose, duration)
    return () => clearTimeout(t)
  }, [open, duration, onClose])

  const colorMap: Record<ToastType, string> = {
    info: 'bg-gray-800 text-white',
    success: 'bg-green-600 text-white',
    error: 'bg-red-600 text-white'
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.25 }}
          className={`
            fixed
            bottom-20 md:bottom-6
            left-1/2 -translate-x-1/2
            z-[999]
            px-4 py-2
            rounded-lg shadow-xl
            text-sm font-medium
            ${colorMap[type]}
            pointer-events-none
          `}
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
