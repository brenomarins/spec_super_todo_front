# Backend API Design

**Date:** 2026-03-19
**Scope:** REST API contract (OpenAPI 3.0) for the Time Manager application backend

---

## Overview

This document defines the HTTP API contract for a backend that replaces the current local-only IndexedDB storage. The frontend will call this API for all reads and writes (API-primary architecture). The app is single-user and requires no authentication.

**Resources:** Tasks, Tags, Notes, Pomodoro Sessions, Pomodoro Stats, Stats aggregations.

**Base URL:** `http://localhost:{port}/api/v1` (configurable)

---

## Design Decisions

- **No authentication** — single-user, trusted environment
- **API-primary** — IndexedDB is replaced; all state lives on the server
- **Client-generated IDs** — frontend sends nanoid strings as `id` on create (preserves existing ID generation)
- **Action endpoints for Pomodoro** — explicit `complete` and `interrupt` actions instead of generic PATCH, enforcing the session state machine
- **Stats computed server-side** — `GET /stats` returns pre-aggregated data, matching the shape `useStatsData` currently returns
- **Cascade deletes** — `DELETE /tasks/{id}` removes its sessions and stats; `DELETE /tags/{id}` removes the tag from all tasks and notes

---

## OpenAPI 3.0 Specification

```yaml
openapi: 3.0.3
info:
  title: Time Manager API
  version: 1.0.0

servers:
  - url: http://localhost:3000/api/v1

paths:

  # ── Tasks ────────────────────────────────────────────────────────────────────

  /tasks:
    get:
      summary: List all tasks
      operationId: listTasks
      responses:
        '200':
          description: All tasks
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Task'

    post:
      summary: Create a task
      operationId: createTask
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateTaskInput'
      responses:
        '201':
          description: Created task
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Task'

  /tasks/reorder:
    post:
      summary: Reorder tasks within a group
      operationId: reorderTasks
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ReorderInput'
      responses:
        '204':
          description: Reordered

  /tasks/{id}:
    parameters:
      - $ref: '#/components/parameters/id'
    get:
      summary: Get a task
      operationId: getTask
      responses:
        '200':
          description: Task
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Task'
        '404':
          $ref: '#/components/responses/NotFound'
    patch:
      summary: Update a task
      operationId: updateTask
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UpdateTaskInput'
      responses:
        '200':
          description: Updated task
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Task'
        '404':
          $ref: '#/components/responses/NotFound'
    delete:
      summary: Delete a task (cascades to sessions + stats)
      operationId: deleteTask
      responses:
        '204':
          description: Deleted
        '404':
          $ref: '#/components/responses/NotFound'

  /tasks/{id}/notes:
    parameters:
      - $ref: '#/components/parameters/id'
    get:
      summary: List notes linked to a task
      operationId: listNotesByTask
      responses:
        '200':
          description: Notes linked to this task
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Note'

  /tasks/{id}/sessions:
    parameters:
      - $ref: '#/components/parameters/id'
    get:
      summary: List sessions for a task
      operationId: listSessionsByTask
      responses:
        '200':
          description: Sessions for this task
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/PomodoroSession'

  /tasks/{id}/stats:
    parameters:
      - $ref: '#/components/parameters/id'
    get:
      summary: Get pomodoro stats for a task
      operationId: getStatsByTask
      responses:
        '200':
          description: Stats for this task
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PomodoroStats'
        '404':
          $ref: '#/components/responses/NotFound'

  # ── Tags ─────────────────────────────────────────────────────────────────────

  /tags:
    get:
      summary: List all tags
      operationId: listTags
      responses:
        '200':
          description: All tags
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Tag'
    post:
      summary: Create a tag
      operationId: createTag
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateTagInput'
      responses:
        '201':
          description: Created tag
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Tag'

  /tags/{id}:
    parameters:
      - $ref: '#/components/parameters/id'
    patch:
      summary: Update a tag
      operationId: updateTag
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UpdateTagInput'
      responses:
        '200':
          description: Updated tag
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Tag'
        '404':
          $ref: '#/components/responses/NotFound'
    delete:
      summary: Delete a tag (removes from all tasks and notes)
      operationId: deleteTag
      responses:
        '204':
          description: Deleted
        '404':
          $ref: '#/components/responses/NotFound'

  # ── Notes ────────────────────────────────────────────────────────────────────

  /notes:
    get:
      summary: List all notes
      operationId: listNotes
      responses:
        '200':
          description: All notes
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Note'
    post:
      summary: Create a note
      operationId: createNote
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateNoteInput'
      responses:
        '201':
          description: Created note
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Note'

  /notes/{id}:
    parameters:
      - $ref: '#/components/parameters/id'
    get:
      summary: Get a note
      operationId: getNote
      responses:
        '200':
          description: Note
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Note'
        '404':
          $ref: '#/components/responses/NotFound'
    patch:
      summary: Update a note
      operationId: updateNote
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UpdateNoteInput'
      responses:
        '200':
          description: Updated note
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Note'
        '404':
          $ref: '#/components/responses/NotFound'
    delete:
      summary: Delete a note
      operationId: deleteNote
      responses:
        '204':
          description: Deleted
        '404':
          $ref: '#/components/responses/NotFound'

  # ── Pomodoro Sessions ────────────────────────────────────────────────────────

  /sessions:
    get:
      summary: List sessions
      operationId: listSessions
      parameters:
        - name: taskId
          in: query
          required: false
          schema:
            type: string
          description: Filter by task ID
      responses:
        '200':
          description: Sessions
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/PomodoroSession'

  /sessions/open:
    get:
      summary: Get the currently active session (if any)
      operationId: getOpenSession
      responses:
        '200':
          description: Open session or null
          content:
            application/json:
              schema:
                oneOf:
                  - $ref: '#/components/schemas/PomodoroSession'
                  - type: 'null'

  /sessions/work:
    post:
      summary: Start a 25-minute work session
      operationId: startWorkSession
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [taskId]
              properties:
                taskId:
                  type: string
      responses:
        '201':
          description: Created session
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PomodoroSession'

  /sessions/break:
    post:
      summary: Start a break session
      operationId: startBreakSession
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [type]
              properties:
                taskId:
                  type: string
                type:
                  type: string
                  enum: [short_break, long_break]
      responses:
        '201':
          description: Created session
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PomodoroSession'

  /sessions/{id}/complete:
    parameters:
      - $ref: '#/components/parameters/id'
    post:
      summary: Complete a session
      operationId: completeSession
      description: >
        For work sessions: sets completedAt to now, sets isOpen=0, increments
        totalCompleted and totalMinutesFocused in PomodoroStats.
        For break sessions: sets completedAt to now, sets isOpen=0.
      responses:
        '204':
          description: Completed
        '404':
          $ref: '#/components/responses/NotFound'

  /sessions/{id}/interrupt:
    parameters:
      - $ref: '#/components/parameters/id'
    post:
      summary: Interrupt a work session
      operationId: interruptSession
      description: >
        Work sessions only. Sets isOpen=0, completedAt remains null (null signals
        interrupted). Increments totalInterrupted in PomodoroStats.
      responses:
        '204':
          description: Interrupted
        '404':
          $ref: '#/components/responses/NotFound'

  # ── Stats ────────────────────────────────────────────────────────────────────

  /stats:
    get:
      summary: Get aggregated focus stats
      operationId: getStats
      parameters:
        - name: filter
          in: query
          required: false
          schema:
            type: string
            enum: [all, week, today]
            default: all
          description: >
            all = all-time (weeklyTrend: last 8 ISO weeks, dailyFocus: last 30 days);
            week = current ISO week (both arrays: 7 entries Mon–Sun);
            today = today (both arrays: 24 entries, one per hour)
      responses:
        '200':
          description: Aggregated stats
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/StatsResponse'

# ── Components ───────────────────────────────────────────────────────────────

components:

  parameters:
    id:
      name: id
      in: path
      required: true
      schema:
        type: string

  responses:
    NotFound:
      description: Resource not found
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'

  schemas:

    # ── Task ──────────────────────────────────────────────────────────────────

    Task:
      type: object
      required: [id, title, completed, order, tagIds, createdAt, updatedAt]
      properties:
        id:
          type: string
        title:
          type: string
        description:
          type: string
        completed:
          type: boolean
        parentId:
          type: string
          nullable: true
        order:
          type: integer
        tagIds:
          type: array
          items:
            type: string
        scheduledDay:
          type: string
          format: date
          nullable: true
          description: YYYY-MM-DD
        dueDate:
          type: string
          format: date
          nullable: true
          description: YYYY-MM-DD
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time

    CreateTaskInput:
      type: object
      required: [title]
      properties:
        id:
          type: string
          description: Client-generated nanoid; server uses it if provided, generates one otherwise
        title:
          type: string
        description:
          type: string
        completed:
          type: boolean
          default: false
        parentId:
          type: string
        order:
          type: integer
          default: 0
        tagIds:
          type: array
          items:
            type: string
          default: []
        scheduledDay:
          type: string
          format: date
        dueDate:
          type: string
          format: date

    UpdateTaskInput:
      type: object
      properties:
        title:
          type: string
        description:
          type: string
        completed:
          type: boolean
        parentId:
          type: string
          nullable: true
        order:
          type: integer
        tagIds:
          type: array
          items:
            type: string
        scheduledDay:
          type: string
          format: date
          nullable: true
        dueDate:
          type: string
          format: date
          nullable: true

    ReorderInput:
      type: object
      required: [orderedIds]
      properties:
        parentId:
          type: string
          nullable: true
          description: null or absent = top-level tasks
        orderedIds:
          type: array
          items:
            type: string
          description: Full desired order for the group; assigned order 1000, 2000, 3000…

    # ── Tag ───────────────────────────────────────────────────────────────────

    Tag:
      type: object
      required: [id, name, color]
      properties:
        id:
          type: string
        name:
          type: string
        color:
          type: string
          description: Hex color e.g. "#3b82f6"

    CreateTagInput:
      type: object
      required: [name, color]
      properties:
        id:
          type: string
          description: Client-generated nanoid; server uses it if provided
        name:
          type: string
        color:
          type: string

    UpdateTagInput:
      type: object
      properties:
        name:
          type: string
        color:
          type: string

    # ── Note ──────────────────────────────────────────────────────────────────

    Note:
      type: object
      required: [id, title, content, tagIds, linkedTaskIds, createdAt, updatedAt]
      properties:
        id:
          type: string
        title:
          type: string
          description: Plain text; defaults to "Untitled"
        content:
          type: string
          description: TipTap JSON serialized as string
        tagIds:
          type: array
          items:
            type: string
        linkedTaskIds:
          type: array
          items:
            type: string
          description: Re-derived from TipTap node views on each save
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time

    CreateNoteInput:
      type: object
      required: [title, content]
      properties:
        id:
          type: string
          description: Client-generated nanoid; server uses it if provided
        title:
          type: string
        content:
          type: string
        tagIds:
          type: array
          items:
            type: string
          default: []
        linkedTaskIds:
          type: array
          items:
            type: string
          default: []

    UpdateNoteInput:
      type: object
      properties:
        title:
          type: string
        content:
          type: string
        tagIds:
          type: array
          items:
            type: string
        linkedTaskIds:
          type: array
          items:
            type: string

    # ── Pomodoro ──────────────────────────────────────────────────────────────

    PomodoroSession:
      type: object
      required: [id, startedAt, type, durationMinutes, isOpen]
      properties:
        id:
          type: string
        taskId:
          type: string
          nullable: true
        startedAt:
          type: string
          format: date-time
        completedAt:
          type: string
          format: date-time
          nullable: true
          description: null = active or interrupted
        type:
          type: string
          enum: [work, short_break, long_break]
        durationMinutes:
          type: integer
          description: 25 for work, 5 for short_break, 15 for long_break
        isOpen:
          type: integer
          enum: [0, 1]
          description: 1 = active session, 0 = closed (completed or interrupted)

    PomodoroStats:
      type: object
      required: [taskId, totalStarted, totalCompleted, totalInterrupted, totalMinutesFocused, updatedAt]
      properties:
        taskId:
          type: string
        totalStarted:
          type: integer
        totalCompleted:
          type: integer
        totalInterrupted:
          type: integer
        totalMinutesFocused:
          type: integer
        lastSessionAt:
          type: string
          format: date-time
          nullable: true
        updatedAt:
          type: string
          format: date-time

    # ── Stats ─────────────────────────────────────────────────────────────────

    StatsResponse:
      type: object
      required: [totalMinutesFocused, totalCompleted, totalInterrupted, weeklyTrend, taskStats, dailyFocus]
      properties:
        totalMinutesFocused:
          type: integer
        totalCompleted:
          type: integer
        totalInterrupted:
          type: integer
        completionRate:
          type: number
          nullable: true
          description: completed / (completed + interrupted); null when no sessions
        weeklyTrend:
          type: array
          items:
            type: object
            required: [label, hours]
            properties:
              label:
                type: string
              hours:
                type: number
        taskStats:
          type: array
          description: Sorted by minutesFocused descending; only existing tasks included
          items:
            type: object
            required: [taskId, title, minutesFocused, completed, interrupted, started]
            properties:
              taskId:
                type: string
              title:
                type: string
              minutesFocused:
                type: integer
              completed:
                type: integer
              interrupted:
                type: integer
              started:
                type: integer
        dailyFocus:
          type: array
          items:
            type: object
            required: [date, hours]
            properties:
              date:
                type: string
                description: YYYY-MM-DD (all/week) or hour number as string (today)
              hours:
                type: number

    # ── Error ─────────────────────────────────────────────────────────────────

    ErrorResponse:
      type: object
      required: [error]
      properties:
        error:
          type: string
```

---

## Endpoint Summary

| Method | Path | Description |
|--------|------|-------------|
| GET | /tasks | List all tasks |
| POST | /tasks | Create task |
| GET | /tasks/{id} | Get task |
| PATCH | /tasks/{id} | Update task |
| DELETE | /tasks/{id} | Delete task (cascade) |
| POST | /tasks/reorder | Reorder task group |
| GET | /tasks/{id}/notes | Notes linked to task |
| GET | /tasks/{id}/sessions | Sessions for task |
| GET | /tasks/{id}/stats | Pomodoro stats for task |
| GET | /tags | List all tags |
| POST | /tags | Create tag |
| PATCH | /tags/{id} | Update tag |
| DELETE | /tags/{id} | Delete tag (cascade) |
| GET | /notes | List all notes |
| POST | /notes | Create note |
| GET | /notes/{id} | Get note |
| PATCH | /notes/{id} | Update note |
| DELETE | /notes/{id} | Delete note |
| GET | /sessions | List sessions (optional ?taskId) |
| GET | /sessions/open | Get open session |
| POST | /sessions/work | Start work session |
| POST | /sessions/break | Start break session |
| POST | /sessions/{id}/complete | Complete session |
| POST | /sessions/{id}/interrupt | Interrupt work session |
| GET | /stats | Aggregated stats (?filter=all\|week\|today) |
