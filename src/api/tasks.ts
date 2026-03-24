// src/api/tasks.ts
import { apiFetch } from './client'
import type { Task } from '../types'

export interface CreateTaskInput {
  id?: string
  title: string
  description?: string
  completed?: boolean
  parentId?: string | null
  order?: number
  tagIds?: string[]
  scheduledDay?: string | null
  dueDate?: string | null
}

export interface UpdateTaskInput {
  title?: string
  description?: string
  completed?: boolean
  parentId?: string | null
  order?: number
  tagIds?: string[]
  scheduledDay?: string | null
  dueDate?: string | null
}

// ⚠️ NOTE on nullable fields in PATCH:
// The swagger.json uses `$ref: JsonNullableString` / `$ref: JsonNullableLocalDate` for
// parentId, scheduledDay, dueDate in UpdateTaskRequest. This is a Java OpenAPI Generator
// pattern. In practice, Spring Boot serializes/deserializes these transparently as plain
// JSON null/string values — sending `"parentId": null` clears the field correctly.
// If you get 400 errors when clearing these fields, check the actual request body the
// backend expects by inspecting the Swagger UI at http://localhost:8091/swagger-ui.html.

export interface ReorderInput {
  parentId?: string | null
  orderedIds: string[]
}

// Spring Boot serializes absent optional fields as JSON null.
// The frontend Task type uses undefined for absent optional fields.
// This normalizer bridges the gap so all consumers can rely on undefined checks.
function normalizeTask(raw: Task): Task {
  return {
    ...raw,
    parentId:     raw.parentId     ?? undefined,
    scheduledDay: raw.scheduledDay ?? undefined,
    dueDate:      raw.dueDate      ?? undefined,
  }
}

export const listTasks = () =>
  apiFetch<Task[]>('/tasks').then(tasks => tasks.map(normalizeTask))

export const getTask = (id: string) =>
  apiFetch<Task>(`/tasks/${id}`).then(normalizeTask)

export const createTask = (input: CreateTaskInput) =>
  apiFetch<Task>('/tasks', {
    method: 'POST',
    body: JSON.stringify(input),
  }).then(normalizeTask)

export const updateTask = (id: string, input: UpdateTaskInput) =>
  apiFetch<Task>(`/tasks/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  }).then(normalizeTask)

export const deleteTask = (id: string) =>
  apiFetch<void>(`/tasks/${id}`, { method: 'DELETE' })

export const reorderTasks = (input: ReorderInput) =>
  apiFetch<void>('/tasks/reorder', {
    method: 'POST',
    body: JSON.stringify(input),
  })
