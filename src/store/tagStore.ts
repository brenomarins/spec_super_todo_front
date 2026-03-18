import { create } from 'zustand'
import type { Tag } from '../types'
import { TagRepository } from '../db/repositories/TagRepository'
import { db } from '../db/db'

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
    const repo = new TagRepository(db)
    const { id: _id, ...input } = tag
    const saved = await repo.create(input)
    set(s => ({ tags: [...s.tags, saved] }))
    return saved
  },
}))
