// src/db/db.ts
import Dexie, { type EntityTable } from 'dexie'
import type { Task, Tag, Note, PomodoroSession, PomodoroStats } from '../types'

export class TimeManagerDB extends Dexie {
  tasks!: EntityTable<Task, 'id'>
  tags!: EntityTable<Tag, 'id'>
  notes!: EntityTable<Note, 'id'>
  pomodoroSessions!: EntityTable<PomodoroSession, 'id'>
  pomodoroStats!: EntityTable<PomodoroStats, 'taskId'>

  constructor() {
    super('TimeManagerDB')
    this.version(1).stores({
      // indexed fields only — Dexie stores all object fields regardless
      tasks: 'id, parentId, scheduledDay, order, *tagIds',
      tags: 'id',
      notes: 'id, *tagIds, *linkedTaskIds',
      pomodoroSessions: 'id, taskId, startedAt, completedAt, isOpen',
      pomodoroStats: 'taskId',
    })
  }
}

export const db = new TimeManagerDB()
