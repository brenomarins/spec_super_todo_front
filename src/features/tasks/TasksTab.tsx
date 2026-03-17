import { useState } from 'react'
import { nanoid } from 'nanoid'
import { AddTaskInput } from './AddTaskInput'
import { TaskList } from './TaskList'
import { TagFilter } from './TagFilter'
import { TaskDetailPanel } from './TaskDetailPanel'
import { useTaskStore } from '../../store/taskStore'
import { useTagStore } from '../../store/tagStore'
import { usePomodoroStore } from '../../store/pomodoroStore'
import { getOrderBetween, needsReindex, reindexGroup } from '../../lib/orderUtils'
import type { Task } from '../../types'

export function TasksTab() {
  const { tasks, addTask, updateTask, reorderTasks } = useTaskStore()
  const { tags, addTag } = useTagStore()
  const { activeSession, stats, sessions } = usePomodoroStore() as any

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [filterTagId, setFilterTagId] = useState<string | null>(null)

  const topLevelTasks = tasks.filter((t: Task) => !t.parentId)
  const subtasks = tasks.filter((t: Task) => !!t.parentId)

  const filteredTopLevel = filterTagId
    ? topLevelTasks.filter((t: Task) => t.tagIds.includes(filterTagId))
    : topLevelTasks

  const selectedTask = tasks.find((t: Task) => t.id === selectedTaskId) ?? null
  const selectedSubtasks = selectedTask ? subtasks.filter((s: Task) => s.parentId === selectedTask.id) : []
  const selectedSessions = selectedTask ? ((sessions as Record<string, unknown[]>)?.[selectedTask.id] ?? []) : []
  const selectedStats = selectedTask ? ((stats as Record<string, unknown>)?.[selectedTask.id] ?? null) : null

  async function handleAddTask(title: string) {
    const lastOrder = topLevelTasks.length > 0 ? Math.max(...topLevelTasks.map((t: Task) => t.order)) : 0
    const order = getOrderBetween(lastOrder, null)
    const ts = new Date().toISOString()
    const task: Task = {
      id: nanoid(), title, completed: false, order, tagIds: [],
      createdAt: ts, updatedAt: ts,
    }
    await addTask(task)
  }

  async function handleAddSubtask(parentId: string, title: string) {
    const siblings = subtasks.filter((s: Task) => s.parentId === parentId)
    const lastOrder = siblings.length > 0 ? Math.max(...siblings.map((s: Task) => s.order)) : 0
    const order = getOrderBetween(lastOrder, null)
    const ts = new Date().toISOString()
    const task: Task = {
      id: nanoid(), title, completed: false, order, tagIds: [],
      parentId, createdAt: ts, updatedAt: ts,
    }
    await addTask(task)
  }

  async function handleReorder(orderedIds: string[]) {
    await reorderTasks(orderedIds, null)
    const updatedTasks = topLevelTasks.filter((t: Task) => orderedIds.includes(t.id))
    const orders = updatedTasks.map((t: Task) => t.order)
    if (needsReindex(orders)) {
      const idToOrder = new Map(updatedTasks.map((t: Task) => [t.id, t.order]))
      const reindexed = reindexGroup(orderedIds, idToOrder)
      await Promise.all([...reindexed.entries()].map(([id, order]) =>
        updateTask({ id, order })
      ))
    }
  }

  async function handleTagCreate(name: string) {
    const newTag = await addTag({ id: nanoid(), name, color: '#3b82f6' })
    if (selectedTask) {
      await updateTask({ id: selectedTask.id, tagIds: [...selectedTask.tagIds, newTag.id] })
    }
  }

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      <div style={{ flex: 1, padding: 16, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <AddTaskInput onAdd={handleAddTask} />
        <TagFilter tags={tags} selectedId={filterTagId} onSelect={setFilterTagId} />
        <TaskList
          tasks={filteredTopLevel}
          subtasks={subtasks}
          tags={tags}
          pomodoroStats={(stats as any) ?? {}}
          activeTaskId={(activeSession as any)?.taskId ?? null}
          onTaskClick={setSelectedTaskId}
          onTaskToggle={(id) => {
            const t = tasks.find((x: Task) => x.id === id)
            if (t) updateTask({ id, completed: !t.completed })
          }}
          onTaskReorder={handleReorder}
        />
      </div>

      {selectedTask && (
        <TaskDetailPanel
          task={selectedTask}
          subtasks={selectedSubtasks}
          tags={tags.filter((tg) => selectedTask.tagIds.includes(tg.id))}
          allTags={tags}
          linkedNotes={[]}
          pomodoroStats={selectedStats as any}
          sessions={selectedSessions as any}
          onClose={() => setSelectedTaskId(null)}
          onUpdate={updateTask}
          onAddSubtask={handleAddSubtask}
          onTagChange={(ids) => updateTask({ id: selectedTask.id, tagIds: ids })}
          onTagCreate={handleTagCreate}
        />
      )}
    </div>
  )
}
