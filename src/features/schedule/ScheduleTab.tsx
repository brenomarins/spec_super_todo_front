// src/features/schedule/ScheduleTab.tsx
import { useState } from 'react'
import { DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { startOfISOWeek, addDays, format } from 'date-fns'
import { addWeeks, isToday } from '../../lib/dateUtils'
import { WeekNavigation } from './WeekNavigation'
import { DayColumn } from './DayColumn'
import { UnscheduledPanel } from './UnscheduledPanel'
import { TaskDetailPanel } from '../tasks/TaskDetailPanel'
import { useTaskStore } from '../../store/taskStore'
import { useTagStore } from '../../store/tagStore'
import type { PomodoroStats, PomodoroSession } from '../../types'

const DAY_LABELS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']

export function ScheduleTab() {
  const { tasks, updateTask } = useTaskStore()
  const { tags } = useTagStore()
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)

  // Re-interpret today as local noon to avoid UTC-offset issues (same as dateUtils.getWeekDays)
  const now = new Date()
  const localNoon = new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12, 0, 0)
  const weekStart = addWeeks(startOfISOWeek(localNoon), weekOffset)

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const dayStrings = days.map(d => format(d, 'yyyy-MM-dd'))

  const scheduledThisWeek = tasks.filter((t) => t.scheduledDay && dayStrings.includes(t.scheduledDay))
  const unscheduled = tasks.filter((t) => !t.scheduledDay && !t.parentId)

  const selectedTask = tasks.find(t => t.id === selectedTaskId) ?? null
  const allSubtasks = tasks.filter(t => !!t.parentId)
  const selectedSubtasks = selectedTask ? allSubtasks.filter(s => s.parentId === selectedTask.id) : []
  const selectedStats: PomodoroStats | null = null  // wired in Tasks 32-34
  const selectedSessions: PomodoroSession[] = []    // wired in Tasks 32-34

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return

    const rawId = String(active.id)
    const taskId = rawId.startsWith('unscheduled-') ? rawId.slice('unscheduled-'.length) : rawId
    const overId = String(over.id)

    if (overId.startsWith('day-')) {
      const day = overId.slice('day-'.length)
      updateTask({ id: taskId, scheduledDay: day })
    } else if (overId === 'unscheduled') {
      updateTask({ id: taskId, scheduledDay: undefined })
    }
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 16, gap: 12, overflow: 'hidden' }}>
          <WeekNavigation
            weekStart={weekStart}
            onPrev={() => setWeekOffset(o => o - 1)}
            onNext={() => setWeekOffset(o => o + 1)}
          />
          <div style={{ display: 'flex', flex: 1, gap: 0, overflow: 'hidden' }}>
            <UnscheduledPanel tasks={unscheduled} tags={tags} onTaskClick={setSelectedTaskId} />
            <div style={{ flex: 1, display: 'flex', gap: 4, overflowX: 'auto', padding: '0 8px' }}>
              {days.map((day, i) => (
                <DayColumn
                  key={dayStrings[i]}
                  day={dayStrings[i]}
                  label={DAY_LABELS[i]}
                  tasks={scheduledThisWeek.filter(t => t.scheduledDay === dayStrings[i])}
                  tags={tags}
                  isToday={isToday(dayStrings[i])}
                  onTaskClick={setSelectedTaskId}
                  onRemoveDay={(id) => updateTask({ id, scheduledDay: undefined })}
                />
              ))}
            </div>
          </div>
        </div>
        {selectedTask && (
          <TaskDetailPanel
            task={selectedTask}
            subtasks={selectedSubtasks}
            tags={tags.filter(tg => selectedTask.tagIds.includes(tg.id))}
            allTags={tags}
            linkedNotes={[]}  // wired in Notes feature (Tasks 27-31)
            pomodoroStats={selectedStats}
            sessions={selectedSessions}
            onClose={() => setSelectedTaskId(null)}
            onUpdate={updateTask}
            onAddSubtask={() => {}}  // deferred — subtask creation via TasksTab
            onTagChange={(ids) => updateTask({ id: selectedTask.id, tagIds: ids })}
            onTagCreate={() => {}}   // deferred — tag creation via TasksTab
          />
        )}
      </div>
    </DndContext>
  )
}
