// src/features/schedule/ScheduleTab.tsx
import { useState } from 'react'
import { DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { startOfISOWeek, addDays, format, isToday } from 'date-fns'
import { addWeeks } from '../../lib/dateUtils'
import { WeekNavigation } from './WeekNavigation'
import { DayColumn } from './DayColumn'
import { UnscheduledPanel } from './UnscheduledPanel'
import { useTaskStore } from '../../store/taskStore'
import { useTagStore } from '../../store/tagStore'

const DAY_LABELS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']

export function ScheduleTab() {
  const { tasks, updateTask } = useTaskStore()
  const { tags } = useTagStore()
  const sensors = useSensors(useSensor(PointerSensor))

  const [weekOffset, setWeekOffset] = useState(0)
  // Re-interpret today as local noon to avoid UTC-offset issues (same as dateUtils.getWeekDays)
  const now = new Date()
  const localNoon = new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12, 0, 0)
  const weekStart = addWeeks(startOfISOWeek(localNoon), weekOffset)

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const dayStrings = days.map(d => format(d, 'yyyy-MM-dd'))

  const scheduledThisWeek = tasks.filter((t) => t.scheduledDay && dayStrings.includes(t.scheduledDay))
  const unscheduled = tasks.filter((t) => !t.scheduledDay && !t.parentId)

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return

    const taskId = String(active.id).replace('unscheduled-', '')
    const overId = String(over.id)

    if (overId.startsWith('day-')) {
      const day = overId.replace('day-', '')
      updateTask({ id: taskId, scheduledDay: day })
    } else if (overId === 'unscheduled') {
      updateTask({ id: taskId, scheduledDay: undefined })
    }
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 16, gap: 12 }}>
        <WeekNavigation
          weekStart={weekStart}
          onPrev={() => setWeekOffset(o => o - 1)}
          onNext={() => setWeekOffset(o => o + 1)}
        />
        <div style={{ display: 'flex', flex: 1, gap: 0, overflow: 'hidden' }}>
          <UnscheduledPanel tasks={unscheduled} tags={tags} onTaskClick={() => {}} />
          <div style={{ flex: 1, display: 'flex', gap: 4, overflowX: 'auto', padding: '0 8px' }}>
            {days.map((day, i) => (
              <DayColumn
                key={dayStrings[i]}
                day={dayStrings[i]}
                label={DAY_LABELS[i]}
                tasks={scheduledThisWeek.filter(t => t.scheduledDay === dayStrings[i])}
                tags={tags}
                isToday={isToday(day)}
                onTaskClick={() => {}}
                onRemoveDay={(id) => updateTask({ id, scheduledDay: undefined })}
              />
            ))}
          </div>
        </div>
      </div>
    </DndContext>
  )
}
