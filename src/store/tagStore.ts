// src/store/tagStore.ts
import { create } from 'zustand'
import type { Tag } from '../types'
import * as api from '../api/tags'

interface TagStore {
  tags: Tag[]
  setTags: (tags: Tag[]) => void
  upsertTag: (tag: Tag) => void
  removeTag: (id: string) => void
  addTag: (tag: Tag) => Promise<Tag>
}

export const useTagStore = create<TagStore>(set => ({
  tags: [],
  setTags: tags => set({ tags }),
  upsertTag: tag =>
    set(s => ({
      tags: s.tags.some(t => t.id === tag.id)
        ? s.tags.map(t => t.id === tag.id ? tag : t)
        : [...s.tags, tag],
    })),
  removeTag: id => set(s => ({ tags: s.tags.filter(t => t.id !== id) })),
  addTag: async (tag) => {
    const saved = await api.createTag({ id: tag.id, name: tag.name, color: tag.color })
    set(s => ({ tags: [...s.tags, saved] }))
    return saved
  },
}))
