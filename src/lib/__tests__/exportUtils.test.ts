import { buildExportPayload, downloadJSON } from '../exportUtils'
import type { Task, Tag, Note, PomodoroSession } from '../../types'

describe('buildExportPayload', () => {
  it('produces correct envelope with version 1', () => {
    const payload = buildExportPayload([], [], [], [])
    expect(payload.version).toBe(1)
    expect(payload.tasks).toEqual([])
    expect(payload.exportedAt).toBeTruthy()
  })

  it('includes all provided data', () => {
    const task = { id: 't1' } as Task
    const payload = buildExportPayload([task], [], [], [])
    expect(payload.tasks).toHaveLength(1)
  })
})
