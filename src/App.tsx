import { useState, useEffect } from 'react'
import { TabBar, type Tab } from './components/TabBar'
import { ToastProvider } from './components/ToastProvider'
import { RecoveryScreen } from './components/RecoveryScreen'
import { db } from './db/db'

export default function App() {
  const [tab, setTab] = useState<Tab>('home')
  const [dbError, setDbError] = useState(false)

  useEffect(() => {
    db.open().catch(() => setDbError(true))
  }, [])

  return (
    <ToastProvider>
      {dbError ? (
        <RecoveryScreen />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
          <TabBar active={tab} onChange={setTab} />
          <main style={{ flex: 1, overflow: 'auto', padding: 16 }}>
            {tab === 'home' && <div>Home tab — coming soon</div>}
            {tab === 'tasks' && <div>Tasks tab — coming soon</div>}
            {tab === 'schedule' && <div>Schedule tab — coming soon</div>}
            {tab === 'notes' && <div>Notes tab — coming soon</div>}
          </main>
        </div>
      )}
    </ToastProvider>
  )
}
