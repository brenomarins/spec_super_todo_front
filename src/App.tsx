import { useState, useEffect } from 'react'
import { TabBar, type Tab } from './components/TabBar'
import { ToastProvider } from './components/ToastProvider'
import { RecoveryScreen } from './components/RecoveryScreen'
import { HomeTab } from './features/home/HomeTab'
import { TasksTab } from './features/tasks/TasksTab'
import { ScheduleTab } from './features/schedule/ScheduleTab'
import { NotesTab } from './features/notes/NotesTab'
import { useTaskStore } from './store/taskStore'
import { useTagStore } from './store/tagStore'
import { useNoteStore } from './store/noteStore'
import { usePomodoroStore } from './store/pomodoroStore'
import { recoverStaleSession } from './store/pomodoroStore'
import { TaskRepository } from './db/repositories/TaskRepository'
import { TagRepository } from './db/repositories/TagRepository'
import { NoteRepository } from './db/repositories/NoteRepository'
import { PomodoroRepository } from './db/repositories/PomodoroRepository'
import { db } from './db/db'

export default function App() {
  const [tab, setTab] = useState<Tab>('home')
  const [dbError, setDbError] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    async function init() {
      try {
        await db.open()
        const [tasks, tags, notes] = await Promise.all([
          new TaskRepository(db).getAll(),
          new TagRepository(db).getAll(),
          new NoteRepository(db).getAll(),
        ])
        useTaskStore.getState().setTasks(tasks)
        useTagStore.getState().setTags(tags)
        useNoteStore.getState().setNotes(notes)

        const recovery = await recoverStaleSession()
        if (recovery === 'active') {
          const openSession = await new PomodoroRepository(db).getOpenSession()
          if (openSession) {
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
        console.error('DB init failed', e)
        setDbError(true)
      }
    }
    init()
  }, [])

  if (dbError) {
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
        </main>
      </div>
    </ToastProvider>
  )
}
