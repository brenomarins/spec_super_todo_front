import { downloadJSON, buildExportPayload } from '../lib/exportUtils'
import { db } from '../db/db'

export function RecoveryScreen() {
  async function handleExport() {
    try {
      const [tasks, tags, notes, sessions] = await Promise.all([
        db.tasks.toArray(), db.tags.toArray(),
        db.notes.toArray(), db.pomodoroSessions.toArray(),
      ])
      downloadJSON(buildExportPayload(tasks, tags, notes, sessions))
    } catch {
      alert('Could not read data for export.')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 16 }}>
      <h2>Storage Error</h2>
      <p>The local database could not be opened. Your data may be corrupted or storage is full.</p>
      <button onClick={handleExport}>Export Backup (JSON)</button>
    </div>
  )
}
