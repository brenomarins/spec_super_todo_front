// src/db/repositories/__tests__/NoteRepository.test.ts
import { db } from '../../db'
import { NoteRepository } from '../NoteRepository'

const repo = new NoteRepository(db)

beforeEach(async () => { await db.notes.clear() })

describe('NoteRepository.create', () => {
  it('creates a note with id and timestamps, defaulting title to "Untitled"', async () => {
    const note = await repo.create({ title: '', content: '{}', tagIds: [], linkedTaskIds: [] })
    expect(note.id).toBeTruthy()
    expect(note.title).toBe('Untitled')
  })
})

describe('NoteRepository.getByLinkedTaskId', () => {
  it('returns notes that link to the given taskId', async () => {
    await repo.create({ title: 'N1', content: '{}', tagIds: [], linkedTaskIds: ['t1'] })
    await repo.create({ title: 'N2', content: '{}', tagIds: [], linkedTaskIds: ['t2'] })
    const results = await repo.getByLinkedTaskId('t1')
    expect(results).toHaveLength(1)
    expect(results[0].title).toBe('N1')
  })
})

describe('NoteRepository.delete', () => {
  it('removes the note', async () => {
    const note = await repo.create({ title: 'X', content: '{}', tagIds: [], linkedTaskIds: [] })
    await repo.delete(note.id)
    expect(await db.notes.get(note.id)).toBeUndefined()
  })
})
