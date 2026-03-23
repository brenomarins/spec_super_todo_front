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

export const listTasks = () =>
  apiFetch<Task[]>('/tasks')

export const getTask = (id: string) =>
  apiFetch<Task>(`/tasks/${id}`)

export const createTask = (input: CreateTaskInput) =>
  apiFetch<Task>('/tasks', {
    method: 'POST',
    body: JSON.stringify(input),
  })

export const updateTask = (id: string, input: UpdateTaskInput) =>
  apiFetch<Task>(`/tasks/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })

export const deleteTask = (id: string) =>
  apiFetch<void>(`/tasks/${id}`, { method: 'DELETE' })

export const reorderTasks = (input: ReorderInput) =>
  apiFetch<void>('/tasks/reorder', {
    method: 'POST',
    body: JSON.stringify(input),
  })
