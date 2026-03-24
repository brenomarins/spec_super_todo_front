import { act } from '@testing-library/react'
import { vi, beforeEach, describe, it, expect } from 'vitest'
import { useTagStore } from '../tagStore'

vi.mock('../../api/tags', () => ({
  createTag: vi.fn(),
  updateTag: vi.fn(),
  deleteTag: vi.fn(),
}))

import * as tagsApi from '../../api/tags'

const TAG = { id: 'tag1', name: 'work', color: '#3b82f6' }

describe('tagStore', () => {
  beforeEach(() => {
    useTagStore.setState({ tags: [TAG] })
    vi.clearAllMocks()
  })

  it('updateTag calls api.updateTag and upserts result', async () => {
    const updated = { ...TAG, name: 'Work Updated', color: '#ef4444' }
    vi.mocked(tagsApi.updateTag).mockResolvedValue(updated)

    await act(async () => {
      await useTagStore.getState().updateTag('tag1', { name: 'Work Updated', color: '#ef4444' })
    })

    expect(tagsApi.updateTag).toHaveBeenCalledWith('tag1', { name: 'Work Updated', color: '#ef4444' })
    expect(useTagStore.getState().tags[0]).toEqual(updated)
  })

  it('deleteTag calls api.deleteTag and removes tag from store', async () => {
    vi.mocked(tagsApi.deleteTag).mockResolvedValue(undefined)

    await act(async () => {
      await useTagStore.getState().deleteTag('tag1')
    })

    expect(tagsApi.deleteTag).toHaveBeenCalledWith('tag1')
    expect(useTagStore.getState().tags).toHaveLength(0)
  })
})
