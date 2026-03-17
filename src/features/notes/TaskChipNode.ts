// src/features/notes/TaskChipNode.ts
import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { TaskChipView } from './TaskChipView'

export interface TaskChipNodeOptions {
  onTaskClick: (id: string) => void
}

export const TaskChipNode = Node.create<TaskChipNodeOptions>({
  name: 'taskChip',
  group: 'inline',
  inline: true,
  atom: true,

  addOptions() {
    return { onTaskClick: () => {} }
  },

  addAttributes() {
    return {
      taskId: { default: null },
      taskTitle: { default: null },
      completed: { default: false },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-task-chip]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { 'data-task-chip': '' })]
  },

  addNodeView() {
    return ReactNodeViewRenderer(TaskChipView)
  },
})
