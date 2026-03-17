// src/features/notes/TaskChipView.tsx
import { NodeViewWrapper } from '@tiptap/react'
import type { NodeViewProps } from '@tiptap/react'
import { TaskChip } from './TaskChip'
import type { TaskChipNodeOptions } from './TaskChipNode'

export function TaskChipView({ node, extension }: NodeViewProps) {
  const { taskId, taskTitle, completed } = node.attrs
  const onTaskClick = (extension.options as TaskChipNodeOptions).onTaskClick

  return (
    <NodeViewWrapper as="span" style={{ display: 'inline' }}>
      <TaskChip
        taskId={taskId as string}
        taskTitle={taskTitle as string | null}
        completed={completed as boolean}
        onClick={onTaskClick}
      />
    </NodeViewWrapper>
  )
}
