import { renderHook, waitFor } from '@testing-library/react'
import { db } from '../../db/db'
import { useTaskStore } from '../../store/taskStore'
import { useStatsData } from './useStatsData'

vi.mock('../../store/taskStore')

beforeEach(async () => {
  await db.pomodoroSessions.clear()
  await db.pomodoroStats.clear()
  vi.mocked(useTaskStore).mockReturnValue({ tasks: [] } as any)
})

// ── all-time: cards ──────────────────────────────────────────────────────────

test('all-time: totalMinutesFocused sums from PomodoroStats', async () => {
  vi.mocked(useTaskStore).mockReturnValue({
    tasks: [
      { id: 't1', title: 'Task One' } as any,
      { id: 't2', title: 'Task Two' } as any,
    ],
  } as any)
  await db.pomodoroStats.bulkAdd([
    { taskId: 't1', totalStarted: 5, totalCompleted: 4, totalInterrupted: 1,
      totalMinutesFocused: 100, lastSessionAt: null, updatedAt: '' },
    { taskId: 't2', totalStarted: 3, totalCompleted: 2, totalInterrupted: 1,
      totalMinutesFocused: 50, lastSessionAt: null, updatedAt: '' },
  ])
  const { result } = renderHook(() => useStatsData('all'))
  await waitFor(() => expect(result.current.totalMinutesFocused).toBe(150))
  expect(result.current.totalCompleted).toBe(6)
  expect(result.current.totalInterrupted).toBe(2)
})

test('all-time: completionRate is null when no sessions', async () => {
  const { result } = renderHook(() => useStatsData('all'))
  await waitFor(() => expect(result.current.completionRate).toBeNull())
})

test('all-time: completionRate = completed / (completed + interrupted)', async () => {
  vi.mocked(useTaskStore).mockReturnValue({
    tasks: [{ id: 't1', title: 'T' } as any],
  } as any)
  await db.pomodoroStats.add({
    taskId: 't1', totalStarted: 10, totalCompleted: 8, totalInterrupted: 2,
    totalMinutesFocused: 200, lastSessionAt: null, updatedAt: '',
  })
  const { result } = renderHook(() => useStatsData('all'))
  await waitFor(() => expect(result.current.completionRate).toBeCloseTo(0.8))
})

// ── all-time: task stats ─────────────────────────────────────────────────────

test('all-time: taskStats sorted by minutesFocused descending', async () => {
  vi.mocked(useTaskStore).mockReturnValue({
    tasks: [
      { id: 't1', title: 'Low' } as any,
      { id: 't2', title: 'High' } as any,
    ],
  } as any)
  await db.pomodoroStats.bulkAdd([
    { taskId: 't1', totalStarted: 2, totalCompleted: 2, totalInterrupted: 0,
      totalMinutesFocused: 25, lastSessionAt: null, updatedAt: '' },
    { taskId: 't2', totalStarted: 4, totalCompleted: 4, totalInterrupted: 0,
      totalMinutesFocused: 100, lastSessionAt: null, updatedAt: '' },
  ])
  const { result } = renderHook(() => useStatsData('all'))
  await waitFor(() => expect(result.current.taskStats).toHaveLength(2))
  expect(result.current.taskStats[0].title).toBe('High')
  expect(result.current.taskStats[1].title).toBe('Low')
})

test('all-time: taskStats includes started count from PomodoroStats', async () => {
  vi.mocked(useTaskStore).mockReturnValue({
    tasks: [{ id: 't1', title: 'T' } as any],
  } as any)
  await db.pomodoroStats.add({
    taskId: 't1', totalStarted: 7, totalCompleted: 5, totalInterrupted: 2,
    totalMinutesFocused: 125, lastSessionAt: null, updatedAt: '',
  })
  const { result } = renderHook(() => useStatsData('all'))
  await waitFor(() => expect(result.current.taskStats).toHaveLength(1))
  expect(result.current.taskStats[0].started).toBe(7)
  expect(result.current.taskStats[0].completed).toBe(5)
  expect(result.current.taskStats[0].interrupted).toBe(2)
  expect(result.current.taskStats[0].minutesFocused).toBe(125)
})

test('all-time: tasks not in store are skipped', async () => {
  vi.mocked(useTaskStore).mockReturnValue({ tasks: [] } as any)
  await db.pomodoroStats.add({
    taskId: 'gone-task', totalStarted: 3, totalCompleted: 3, totalInterrupted: 0,
    totalMinutesFocused: 75, lastSessionAt: null, updatedAt: '',
  })
  const { result } = renderHook(() => useStatsData('all'))
  await waitFor(() => expect(result.current.totalMinutesFocused).toBe(75))
  expect(result.current.taskStats).toHaveLength(0)
})
