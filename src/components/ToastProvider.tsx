import React, { createContext, useContext, useState, useCallback, useRef } from 'react'
import { Toast } from './Toast'

interface ToastCtx {
  showToast: (message: string) => void
}

const ToastContext = createContext<ToastCtx>({ showToast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

let _showGlobalToast: (msg: string) => void = () => {}
export function registerGlobalToast(fn: (msg: string) => void) {
  _showGlobalToast = fn
}
export function showGlobalToast(msg: string) {
  _showGlobalToast(msg)
}

interface ToastItem { id: number; message: string }

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextId = useRef(0)

  const showToast = useCallback((message: string) => {
    const id = nextId.current++
    setToasts(t => [...t, { id, message }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000)
  }, [])

  registerGlobalToast(showToast)

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {toasts.map(t => <Toast key={t.id} message={t.message} />)}
      </div>
    </ToastContext.Provider>
  )
}
