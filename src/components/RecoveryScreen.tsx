// src/components/RecoveryScreen.tsx
import { downloadJSON, buildExportPayload } from '../lib/exportUtils'
import * as apiTasks from '../api/tasks'
import * as apiTags from '../api/tags'
import * as apiNotes from '../api/notes'
import * as apiSessions from '../api/sessions'

export function RecoveryScreen() {
  async function handleExport() {
    try {
      const [tasks, tags, notes, sessions] = await Promise.all([
        apiTasks.listTasks(),
        apiTags.listTags(),
        apiNotes.listNotes(),
        apiSessions.listSessions(),
      ])
      downloadJSON(buildExportPayload(tasks, tags, notes, sessions))
    } catch {
      alert('Could not fetch data for export.')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 16 }}>
      <h2>Connection Error</h2>
      <p>Could not connect to the backend. Make sure the server is running.</p>
      <button onClick={handleExport}>Export Backup (JSON)</button>
    </div>
  )
}
