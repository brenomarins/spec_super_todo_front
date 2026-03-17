// src/features/notes/TaskChipNode.ts
import { Node, mergeAttributes } from '@tiptap/core'

export const TaskChipNode = Node.create({
  name: 'taskChip',
  group: 'inline',
  inline: true,
  atom: true,

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
})
