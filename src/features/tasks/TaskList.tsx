import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy, useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { TaskItem } from './TaskItem'
import { TaskGroupSection } from './TaskGroupSection'
import { SubtaskItem } from './SubtaskItem'
import { EmptyState } from '../../components/EmptyState'
import { todayISO, getWeekDays } from '../../lib/dateUtils'
import type { Task, Tag, PomodoroStats } from '../../types'

interface TaskListProps {
  tasks: Task[]
  subtasks: Task[]
  tags: Tag[]
  pomodoroStats: Record<string, PomodoroStats>
  activeTaskId: string | null
  onTaskClick: (id: string) => void
  onTaskToggle: (id: string) => void
  onTaskReorder?: (ids: string[]) => void
  onStartPomodoro?: (id: string) => void
  overdueOnly?: boolean
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

function NonSortableTaskItem(props: {
  task: Task; tags: Tag[]; pomodoroCount: number; isActive: boolean; subtasks: Task[];
  onTaskClick: (id: string) => void; onTaskToggle: (id: string) => void;
  onStartPomodoro?: (id: string) => void
}) {
  const taskSubtasks = props.subtasks.filter(s => s.parentId === props.task.id)
    .sort((a, b) => a.order - b.order)

  return (
    <div>
      <TaskItem
        task={props.task}
        tags={props.tags}
        pomodoroCount={props.pomodoroCount}
        isActive={props.isActive}
        onClick={props.onTaskClick}
        onToggle={props.onTaskToggle}
        onStartPomodoro={props.onStartPomodoro}
        dragHandleProps={null}
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

export function TaskList({
  tasks, subtasks, tags, pomodoroStats, activeTaskId,
  onTaskClick, onTaskToggle, onTaskReorder, onStartPomodoro, overdueOnly = false,
}: TaskListProps) {
  const sensors = useSensors(useSensor(PointerSensor))
  const today = todayISO()
  const weekDays = getWeekDays(new Date())
  const endOfWeek = weekDays[6]

  const overdue = tasks
    .filter(t => t.dueDate !== undefined && t.dueDate < today)
    .sort((a, b) => a.dueDate!.localeCompare(b.dueDate!))
  const dueToday = tasks
    .filter(t => t.dueDate === today)
    .sort((a, b) => a.dueDate!.localeCompare(b.dueDate!))
  const dueThisWeek = tasks
    .filter(t => t.dueDate !== undefined && t.dueDate > today && t.dueDate <= endOfWeek)
    .sort((a, b) => a.dueDate!.localeCompare(b.dueDate!))
  const dueLater = tasks
    .filter(t => t.dueDate !== undefined && t.dueDate > endOfWeek)
    .sort((a, b) => a.dueDate!.localeCompare(b.dueDate!))
  const noDueDate = tasks
    .filter(t => t.dueDate === undefined)
    .sort((a, b) => a.order - b.order)

  const allEmpty =
    overdue.length === 0 && dueToday.length === 0 &&
    dueThisWeek.length === 0 && dueLater.length === 0 && noDueDate.length === 0

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = noDueDate.findIndex(t => t.id === active.id)
    const newIndex = noDueDate.findIndex(t => t.id === over.id)
    const reordered = [...noDueDate]
    const [moved] = reordered.splice(oldIndex, 1)
    reordered.splice(newIndex, 0, moved)
    onTaskReorder?.(reordered.map(t => t.id))
  }

  const sharedProps = { tags, subtasks, onTaskClick, onTaskToggle, onStartPomodoro }
  const pomodoroCount = (t: Task) => pomodoroStats[t.id]?.totalCompleted ?? 0
  const isActive = (t: Task) => activeTaskId === t.id

  if (allEmpty) {
    return <EmptyState message="No tasks yet. Add one above." />
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

        {overdue.length > 0 && (
          <TaskGroupSection label="Overdue" count={overdue.length} isOverdue>
            {overdue.map(task => (
              <NonSortableTaskItem
                key={task.id} task={task}
                pomodoroCount={pomodoroCount(task)} isActive={isActive(task)}
                {...sharedProps}
              />
            ))}
          </TaskGroupSection>
        )}

        {!overdueOnly && dueToday.length > 0 && (
          <TaskGroupSection label="Due Today" count={dueToday.length}>
            {dueToday.map(task => (
              <NonSortableTaskItem
                key={task.id} task={task}
                pomodoroCount={pomodoroCount(task)} isActive={isActive(task)}
                {...sharedProps}
              />
            ))}
          </TaskGroupSection>
        )}

        {!overdueOnly && dueThisWeek.length > 0 && (
          <TaskGroupSection label="Due This Week" count={dueThisWeek.length}>
            {dueThisWeek.map(task => (
              <NonSortableTaskItem
                key={task.id} task={task}
                pomodoroCount={pomodoroCount(task)} isActive={isActive(task)}
                {...sharedProps}
              />
            ))}
          </TaskGroupSection>
        )}

        {!overdueOnly && dueLater.length > 0 && (
          <TaskGroupSection label="Due Later" count={dueLater.length}>
            {dueLater.map(task => (
              <NonSortableTaskItem
                key={task.id} task={task}
                pomodoroCount={pomodoroCount(task)} isActive={isActive(task)}
                {...sharedProps}
              />
            ))}
          </TaskGroupSection>
        )}

        {!overdueOnly && noDueDate.length > 0 && (
          <TaskGroupSection label="No Due Date" count={noDueDate.length}>
            <SortableContext items={noDueDate.map(t => t.id)} strategy={verticalListSortingStrategy}>
              {noDueDate.map(task => (
                <SortableTaskItem
                  key={task.id} task={task}
                  pomodoroCount={pomodoroCount(task)} isActive={isActive(task)}
                  {...sharedProps}
                />
              ))}
            </SortableContext>
          </TaskGroupSection>
        )}

      </div>
    </DndContext>
  )
}
