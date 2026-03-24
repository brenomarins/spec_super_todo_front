import { vi, describe, it, expect, beforeEach } from 'vitest'
import { listTasks, getTask, createTask, updateTask } from '../tasks'

// Mock the entire client module so no real fetch happens
vi.mock('../client', () => ({
  apiFetch: vi.fn(),
}))

// Import the mock AFTER vi.mock so we get the mocked version
import { apiFetch } from '../client'
const mockApiFetch = vi.mocked(apiFetch)

// A raw task as the backend sends it — null for absent optional fields
const rawTask = {
  id: 'abc',
  title: 'Test task',
  completed: false,
  order: 1000,
  tagIds: [],
  parentId: null,
  scheduledDay: null,
  dueDate: null,
  description: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

beforeEach(() => {
  mockApiFetch.mockReset()
})

describe('normalizeTask (via listTasks)', () => {
  it('converts null dueDate to undefined', async () => {
    mockApiFetch.mockResolvedValue([{ ...rawTask }])
    const [task] = await listTasks()
    expect(task.dueDate).toBeUndefined()
  })

  it('converts null scheduledDay to undefined', async () => {
    mockApiFetch.mockResolvedValue([{ ...rawTask }])
    const [task] = await listTasks()
    expect(task.scheduledDay).toBeUndefined()
  })

  it('converts null parentId to undefined', async () => {
    mockApiFetch.mockResolvedValue([{ ...rawTask }])
    const [task] = await listTasks()
    expect(task.parentId).toBeUndefined()
  })

  it('converts null description to undefined', async () => {
    mockApiFetch.mockResolvedValue([{ ...rawTask, description: null }])
    const [task] = await listTasks()
    expect(task.description).toBeUndefined()
  })

  it('preserves string dueDate', async () => {
    mockApiFetch.mockResolvedValue([{ ...rawTask, dueDate: '2026-12-31' }])
    const [task] = await listTasks()
    expect(task.dueDate).toBe('2026-12-31')
  })

  it('preserves string scheduledDay', async () => {
    mockApiFetch.mockResolvedValue([{ ...rawTask, scheduledDay: '2026-12-31' }])
    const [task] = await listTasks()
    expect(task.scheduledDay).toBe('2026-12-31')
  })

  it('preserves string parentId', async () => {
    mockApiFetch.mockResolvedValue([{ ...rawTask, parentId: 'parent-1' }])
    const [task] = await listTasks()
    expect(task.parentId).toBe('parent-1')
  })

  it('preserves all other fields unchanged', async () => {
    mockApiFetch.mockResolvedValue([{ ...rawTask }])
    const [task] = await listTasks()
    expect(task).toStrictEqual({
      id: 'abc',
      title: 'Test task',
      completed: false,
      order: 1000,
      tagIds: [],
      description: undefined,
      parentId: undefined,
      scheduledDay: undefined,
      dueDate: undefined,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    })
  })
})

describe('getTask', () => {
  it('normalizes null fields', async () => {
    mockApiFetch.mockResolvedValue({ ...rawTask })
    const task = await getTask('abc')
    expect(task.dueDate).toBeUndefined()
    expect(task.scheduledDay).toBeUndefined()
    expect(task.parentId).toBeUndefined()
  })
})

describe('createTask', () => {
  it('normalizes null fields in response', async () => {
    mockApiFetch.mockResolvedValue({ ...rawTask })
    const task = await createTask({ title: 'Test task' })
    expect(task.dueDate).toBeUndefined()
    expect(task.scheduledDay).toBeUndefined()
    expect(task.parentId).toBeUndefined()
  })
})

describe('updateTask', () => {
  it('normalizes null fields in response', async () => {
    mockApiFetch.mockResolvedValue({ ...rawTask })
    const task = await updateTask('abc', { title: 'Updated' })
    expect(task.dueDate).toBeUndefined()
    expect(task.scheduledDay).toBeUndefined()
    expect(task.parentId).toBeUndefined()
  })
})
