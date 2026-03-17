// src/db/repositories/__tests__/TagRepository.test.ts
import { db } from '../../db'
import { TagRepository } from '../TagRepository'

const repo = new TagRepository(db)

beforeEach(async () => {
  await db.tags.clear()
  await db.tasks.clear()
  await db.notes.clear()
})

describe('TagRepository.create', () => {
  it('creates a tag with id', async () => {
    const tag = await repo.create({ name: 'work', color: '#3b82f6' })
    expect(tag.id).toBeTruthy()
    expect(tag.name).toBe('work')
  })
})

describe('TagRepository.delete cascade', () => {
  it('removes tagId from all tasks and notes in same transaction', async () => {
    const tag = await repo.create({ name: 'work', color: '#3b82f6' })
    await db.tasks.add({
      id: 't1', title: 'T', completed: false, order: 1000, tagIds: [tag.id],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    })
    await db.notes.add({
      id: 'n1', title: 'N', content: '{}', tagIds: [tag.id], linkedTaskIds: [],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    })
    await repo.delete(tag.id)
    expect(await db.tags.get(tag.id)).toBeUndefined()
    const task = await db.tasks.get('t1')
    expect(task?.tagIds).not.toContain(tag.id)
    const note = await db.notes.get('n1')
    expect(note?.tagIds).not.toContain(tag.id)
  })
})

describe('TagRepository.update', () => {
  it('renames a tag in-place without affecting task/note tagIds', async () => {
    const tag = await repo.create({ name: 'old', color: '#000' })
    await db.tasks.add({
      id: 't1', title: 'T', completed: false, order: 1000, tagIds: [tag.id],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    })
    await repo.update(tag.id, { name: 'new' })
    const updated = await db.tags.get(tag.id)
    expect(updated?.name).toBe('new')
    // tagIds in task unchanged — still references same id
    const task = await db.tasks.get('t1')
    expect(task?.tagIds).toContain(tag.id)
  })
})
