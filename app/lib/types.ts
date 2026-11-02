export interface TodoItem {
  id: string
  text: string
  done: boolean
}

export interface NoteContent {
  title: string
  todos: TodoItem[]
}

export interface Note extends NoteContent {
  id: string
  createdAt: number
  updatedAt: number
}

export type Change =
  | { type: 'title'; before: string; after: string }
  | { type: 'todo-text'; todoId: string; before: string; after: string }
  | { type: 'todo-toggle'; todoId: string; before: boolean; after: boolean }
  | { type: 'todo-add'; index: number; todo: TodoItem }
  | { type: 'todo-remove'; index: number; todo: TodoItem }

export type ChangeDirection = 'undo' | 'redo'

export type SaveValidation = { ok: true } | { ok: false; titleError: string }

export interface StoredNotes {
  version: number
  notes: Note[]
}

export interface StoredDraft {
  version: number
  noteId: string
  isNew: boolean
  baseUpdatedAt: number | null
  content: NoteContent
  savedAt: number
}
