// src/api/tags.ts
import { apiFetch } from './client'
import type { Tag } from '../types'

export interface CreateTagInput {
  id?: string
  name: string
  color: string
}

export interface UpdateTagInput {
  name?: string
  color?: string
}

export const listTags = () =>
  apiFetch<Tag[]>('/tags')

export const createTag = (input: CreateTagInput) =>
  apiFetch<Tag>('/tags', {
    method: 'POST',
    body: JSON.stringify(input),
  })

export const updateTag = (id: string, input: UpdateTagInput) =>
  apiFetch<Tag>(`/tags/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })

export const deleteTag = (id: string) =>
  apiFetch<void>(`/tags/${id}`, { method: 'DELETE' })
