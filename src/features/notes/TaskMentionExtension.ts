// src/features/notes/TaskMentionExtension.ts
import { Extension } from '@tiptap/core'
import { PluginKey } from '@tiptap/pm/state'
import Suggestion from '@tiptap/suggestion'

export const TASK_MENTION_PLUGIN_KEY = new PluginKey('taskMention')

export function shouldOpenPicker(textBeforeCursor: string, char: string): boolean {
  if (char !== '@') return false
  if (textBeforeCursor === '@') return true
  const beforeAt = textBeforeCursor.slice(0, -1)
  return beforeAt.length === 0 || /\s$/.test(beforeAt)
}

export interface TaskMentionOptions {
  suggestion: {
    items: (params: { query: string }) => { id: string; title: string }[]
    render: () => {
      onStart: (props: unknown) => void
      onUpdate: (props: unknown) => void
      onKeyDown: (props: { event: KeyboardEvent }) => boolean
      onExit: () => void
    }
    command: (props: { editor: unknown; range: unknown; props: unknown }) => void
  }
}

export const TaskMentionExtension = Extension.create<TaskMentionOptions>({
  name: 'taskMention',

  addOptions() {
    return {
      suggestion: {
        items: () => [],
        render: () => ({ onStart: () => {}, onUpdate: () => {}, onKeyDown: () => false, onExit: () => {} }),
        command: () => {},
      },
    }
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        char: '@',
        pluginKey: TASK_MENTION_PLUGIN_KEY,
        allow: ({ state, range }) => {
          const $from = state.doc.resolve(range.from)
          const textBefore = $from.parent.textContent.slice(0, $from.parentOffset)
          return shouldOpenPicker(textBefore + '@', '@')
        },
        ...this.options.suggestion,
      }),
    ]
  },
})
