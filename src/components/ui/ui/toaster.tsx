'use client'

import { useEffect, useState } from 'react'

interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}

const toasts: Toast[] = []
const listeners: Array<(toasts: Toast[]) => void> = []

export function toast(message: string, type: Toast['type'] = 'info') {
  const id = Math.random().toString(36).slice(2)
  const newToast: Toast = { id, message, type }
  toasts.push(newToast)
  listeners.forEach((listener) => listener([...toasts]))
  
  setTimeout(() => {
    const index = toasts.findIndex((t) => t.id === id)
    if (index > -1) {
      toasts.splice(index, 1)
      listeners.forEach((listener) => listener([...toasts]))
    }
  }, 5000)
}

export function Toaster() {
  const [displayToasts, setDisplayToasts] = useState<Toast[]>([])

  useEffect(() => {
    listeners.push(setDisplayToasts)
    return () => {
      const index = listeners.indexOf(setDisplayToasts)
      if (index > -1) listeners.splice(index, 1)
    }
  }, [])

  if (displayToasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {displayToasts.map((toast) => (
        <div
          key={toast.id}
          className={`glass p-4 rounded-lg shadow-lg border-2 ${
            toast.type === 'error'
              ? 'border-red-500/50'
              : toast.type === 'success'
              ? 'border-green-500/50'
              : 'border-primary/50'
          }`}
        >
          <p className="text-sm font-medium">{toast.message}</p>
        </div>
      ))}
    </div>
  )
}

