// src/features/notes/NoteEditor.tsx
import { useState, useEffect, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { TagInput } from '../tags/TagInput'
import { TaskChipNode } from './TaskChipNode'
import { TaskMentionExtension } from './TaskMentionExtension'
import { TaskPicker } from './TaskPicker'
import { LinkedTasksPanel } from './LinkedTasksPanel'
import type { Note, Tag, Task } from '../../types'

const ONE_MB = 1_000_000

interface NoteEditorProps {
  note: Note
  tags: Tag[]
  allTags: Tag[]
  allTasks: Task[]
  onSave: (partial: Partial<Note> & { id: string }) => void
  onTagChange: (ids: string[]) => void
  onTagCreate: (name: string) => void
  onTaskClick: (id: string) => void
}

export function extractLinkedTaskIds(json: string): string[] {
  try {
    const doc = JSON.parse(json)
    const ids: string[] = []
    function walk(node: { type?: string; attrs?: { taskId?: string }; content?: unknown[] }) {
      if (node.type === 'taskChip' && node.attrs?.taskId) ids.push(node.attrs.taskId)
      node.content?.forEach(c => walk(c as typeof node))
    }
    walk(doc)
    return [...new Set(ids)]
  } catch { return [] }
}

export function NoteEditor({ note, tags, allTags, allTasks, onSave, onTagChange, onTagCreate, onTaskClick }: NoteEditorProps) {
  const [title, setTitle] = useState(note.title)
  const linkedTasks = allTasks.filter(t => (note.linkedTaskIds ?? []).includes(t.id))
  const [pickerState, setPickerState] = useState<{
    query: string
    position: { top: number; left: number }
    range: { from: number; to: number }
  } | null>(null)

  // mutable bridge between TipTap callback and React state
  const pickerBridge = useRef<{
    setPickerState: typeof setPickerState
  }>({ setPickerState: () => {} })
  pickerBridge.current.setPickerState = setPickerState

  useEffect(() => setTitle(note.title), [note.id, note.title])

  const isBig = note.content.length > ONE_MB

  const editor = useEditor({
    extensions: [
      StarterKit,
      TaskChipNode.configure({ onTaskClick }),
      TaskMentionExtension.configure({
        suggestion: {
          items: ({ query }) =>
            allTasks.filter(t => t.title.toLowerCase().includes(query.toLowerCase())).slice(0, 10),
          render: () => ({
            onStart: (props: any) => {
              const rect = props.clientRect?.()
              if (rect) {
                pickerBridge.current.setPickerState({
                  query: props.query ?? '',
                  position: { top: rect.bottom + 8, left: rect.left },
                  range: props.range,
                })
              }
            },
            onUpdate: (props: any) => {
              pickerBridge.current.setPickerState(prev =>
                prev ? { ...prev, query: props.query ?? '' } : null
              )
            },
            onKeyDown: () => false,
            onExit: () => {
              pickerBridge.current.setPickerState(null)
            },
          }),
          command: ({ editor, range, props }: any) => {
            editor.chain().focus().deleteRange(range).insertContent({
              type: 'taskChip',
              attrs: { taskId: props.id, taskTitle: props.title, completed: props.completed ?? false },
            }).run()
          },
        },
      }),
    ],
    content: note.content ? JSON.parse(note.content) : undefined,
    onBlur: ({ editor }) => {
      const json = JSON.stringify(editor.getJSON())
      const linkedTaskIds = extractLinkedTaskIds(json)
      onSave({ id: note.id, content: json, linkedTaskIds })
    },
  }, [note.id])

  function handlePickerSelect(task: Task) {
    if (editor && pickerState) {
      editor.chain().focus().deleteRange(pickerState.range).insertContent({
        type: 'taskChip',
        attrs: { taskId: task.id, taskTitle: task.title, completed: task.completed },
      }).run()
    }
    setPickerState(null)
  }

  return (
    <div style={{ flex: 1, padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <input
        value={title}
        onChange={e => setTitle(e.target.value)}
        onBlur={() => { if (title !== note.title) onSave({ id: note.id, title }) }}
        placeholder="Untitled"
        style={{ fontSize: 20, fontWeight: 700, background: 'transparent', border: 'none',
          borderBottom: '1px solid var(--color-border)', color: 'var(--color-text)',
          outline: 'none', padding: '4px 0', width: '100%' }}
      />

      <TagInput allTags={allTags} selectedIds={note.tagIds} onChange={onTagChange} onTagCreate={onTagCreate} />

      {isBig && (
        <div style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-warning)', borderRadius: 6,
          padding: '8px 12px', fontSize: 12, color: 'var(--color-warning)' }}>
          ⚠ Note is over 1MB — consider splitting it.
        </div>
      )}

      <EditorContent
        editor={editor}
        style={{ flex: 1, minHeight: 300, fontSize: 14, lineHeight: 1.6 }}
      />

      {pickerState && (
        <TaskPicker
          tasks={allTasks}
          query={pickerState.query}
          position={pickerState.position}
          onSelect={handlePickerSelect}
          onDismiss={() => setPickerState(null)}
        />
      )}

      {linkedTasks.length > 0 && (
        <LinkedTasksPanel tasks={linkedTasks} onTaskClick={onTaskClick} />
      )}
    </div>
  )
}
