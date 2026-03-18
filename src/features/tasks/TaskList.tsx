import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy, useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { TaskItem } from './TaskItem'
import { SubtaskItem } from './SubtaskItem'
import { EmptyState } from '../../components/EmptyState'
import type { Task, Tag, PomodoroStats } from '../../types'

interface TaskListProps {
  tasks: Task[]
  subtasks: Task[]
  tags: Tag[]
  pomodoroStats: Record<string, PomodoroStats>
  activeTaskId: string | null
  onTaskClick: (id: string) => void
  onTaskToggle: (id: string) => void
  onTaskReorder: (ids: string[]) => void
  onStartPomodoro?: (id: string) => void
}

function SortableTaskItem(props: {
  task: Task; tags: Tag[]; pomodoroCount: number; isActive: boolean; subtasks: Task[];
  onTaskClick: (id: string) => void; onTaskToggle: (id: string) => void;
  onStartPomodoro?: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: props.task.id })
  const style = { transform: CSS.Transform.toString(transform), transition }
  const taskSubtasks = props.subtasks.filter(s => s.parentId === props.task.id)
    .sort((a, b) => a.order - b.order)

  return (
    <div ref={setNodeRef} style={style}>
      <TaskItem
        task={props.task}
        tags={props.tags}
        pomodoroCount={props.pomodoroCount}
        isActive={props.isActive}
        onClick={props.onTaskClick}
        onToggle={props.onTaskToggle}
        onStartPomodoro={props.onStartPomodoro}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
      {taskSubtasks.length > 0 && (
        <div style={{ marginLeft: 24, borderLeft: '2px solid var(--color-border)', paddingLeft: 12, marginTop: 4 }}>
          {taskSubtasks.map(sub => (
            <SubtaskItem key={sub.id} task={sub} onClick={props.onTaskClick} onToggle={props.onTaskToggle} />
          ))}
        </div>
      )}
    </div>
  )
}

export function TaskList({ tasks, subtasks, tags, pomodoroStats, activeTaskId,
  onTaskClick, onTaskToggle, onTaskReorder, onStartPomodoro }: TaskListProps) {
  const sensors = useSensors(useSensor(PointerSensor))
  const sorted = [...tasks].sort((a, b) => a.order - b.order)

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = sorted.findIndex(t => t.id === active.id)
    const newIndex = sorted.findIndex(t => t.id === over.id)
    const reordered = [...sorted]
    const [moved] = reordered.splice(oldIndex, 1)
    reordered.splice(newIndex, 0, moved)
    onTaskReorder(reordered.map(t => t.id))
  }

  if (tasks.length === 0) {
    return <EmptyState message="No tasks yet. Add one above." />
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={sorted.map(t => t.id)} strategy={verticalListSortingStrategy}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {sorted.map(task => (
            <SortableTaskItem
              key={task.id}
              task={task}
              tags={tags}
              pomodoroCount={pomodoroStats[task.id]?.totalCompleted ?? 0}
              isActive={activeTaskId === task.id}
              subtasks={subtasks}
              onTaskClick={onTaskClick}
              onTaskToggle={onTaskToggle}
              onStartPomodoro={onStartPomodoro}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
