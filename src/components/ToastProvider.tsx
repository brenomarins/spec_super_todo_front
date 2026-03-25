import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'
import { Toast } from './Toast'

type ToastVariant = 'success' | 'error' | 'default'

interface ToastCtx {
  showToast: (message: string, variant?: ToastVariant) => void
}

const ToastContext = createContext<ToastCtx>({ showToast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

let _showGlobalToast: (msg: string, variant?: ToastVariant) => void = () => {}
export function registerGlobalToast(fn: (msg: string, variant?: ToastVariant) => void) {
  _showGlobalToast = fn
}
export function showGlobalToast(msg: string, variant?: ToastVariant) {
  _showGlobalToast(msg, variant)
}

interface ToastItem { id: number; message: string; variant?: ToastVariant }

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextId = useRef(0)

  const showToast = useCallback((message: string, variant?: ToastVariant) => {
    const id = nextId.current++
    setToasts(t => [...t, { id, message, variant }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000)
  }, [])

  useEffect(() => {
    registerGlobalToast(showToast)
  }, [showToast])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div style={{
        position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
        zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        {toasts.map(t => <Toast key={t.id} message={t.message} variant={t.variant} />)}
      </div>
    </ToastContext.Provider>
  )
}
