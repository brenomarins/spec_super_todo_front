// src/App.tsx
import { useState, useEffect } from 'react'
import { TabBar, type Tab } from './components/TabBar'
import { ToastProvider } from './components/ToastProvider'
import { RecoveryScreen } from './components/RecoveryScreen'
import { HomeTab } from './features/home/HomeTab'
import { TasksTab } from './features/tasks/TasksTab'
import { ScheduleTab } from './features/schedule/ScheduleTab'
import { NotesTab } from './features/notes/NotesTab'
import { StatsTab } from './features/stats/StatsTab'
import { TagsTab } from './features/tags/TagsTab'
import { useTaskStore } from './store/taskStore'
import { useTagStore } from './store/tagStore'
import { useNoteStore } from './store/noteStore'
import { usePomodoroStore } from './store/pomodoroStore'
import * as apiTasks from './api/tasks'
import * as apiTags from './api/tags'
import * as apiNotes from './api/notes'
import * as apiSessions from './api/sessions'

const TWO_HOURS_MS = 2 * 60 * 60 * 1000

export default function App() {
  const [tab, setTab] = useState<Tab>('home')
  const [apiError, setApiError] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    async function init() {
      try {
        const [tasks, tags, notes] = await Promise.all([
          apiTasks.listTasks(),
          apiTags.listTags(),
          apiNotes.listNotes(),
        ])
        useTaskStore.getState().setTasks(tasks)
        useTagStore.getState().setTags(tags)
        useNoteStore.getState().setNotes(notes)

        const openSession = await apiSessions.getOpenSession()
        if (openSession) {
          const age = Date.now() - Date.parse(openSession.startedAt)
          if (age > TWO_HOURS_MS) {
            // stale session — close it without restoring
            // interrupt is work-only per API spec; use complete for break sessions
            if (openSession.type === 'work') {
              await apiSessions.interruptSession(openSession.id)
            } else {
              await apiSessions.completeSession(openSession.id)
            }
          } else {
            usePomodoroStore.getState().setActiveSession({
              sessionId: openSession.id,
              taskId: openSession.taskId,
              type: openSession.type,
              startedAt: openSession.startedAt,
            })
          }
        }

        setLoaded(true)
      } catch (e) {
        console.error('API init failed', e)
        setApiError(true)
      }
    }
    init()
  }, [])

  if (apiError) {
    return (
      <ToastProvider>
        <RecoveryScreen />
      </ToastProvider>
    )
  }

  if (!loaded) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--color-bg)' }}>
        <span style={{ color: 'var(--color-text-muted)' }}>Loading…</span>
      </div>
    )
  }

  return (
    <ToastProvider>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--color-bg)' }}>
        <TabBar active={tab} onChange={setTab} />
        <main style={{ flex: 1, overflow: 'hidden' }}>
          {tab === 'home' && <HomeTab />}
          {tab === 'tasks' && <TasksTab />}
          {tab === 'schedule' && <ScheduleTab />}
          {tab === 'notes' && <NotesTab />}
          {tab === 'stats' && <StatsTab />}
          {tab === 'tags' && <TagsTab />}
        </main>
      </div>
    </ToastProvider>
  )
}
