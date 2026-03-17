import type { Task, Tag, Note, PomodoroSession } from '../types'

export interface ExportPayload {
  version: 1
  exportedAt: string
  tasks: Task[]
  tags: Tag[]
  notes: Note[]
  pomodoroSessions: PomodoroSession[]
}

export function buildExportPayload(
  tasks: Task[],
  tags: Tag[],
  notes: Note[],
  pomodoroSessions: PomodoroSession[],
): ExportPayload {
  return { version: 1, exportedAt: new Date().toISOString(), tasks, tags, notes, pomodoroSessions }
}

export function downloadJSON(payload: ExportPayload): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `time-manager-backup-${payload.exportedAt.slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}
