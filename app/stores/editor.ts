import { computed, ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import { TEXT_COMMIT_DELAY_MS } from '~/lib/constants'
import { createDebouncedRunner } from '~/lib/debounce'
import { createHistory } from '~/lib/history'
import {
  applyChange,
  cloneContent,
  cloneTodo,
  contentEquals,
  contentOf,
  createEmptyContent,
  createId,
  createTodo,
  normalizeForSave,
  validateForSave,
} from '~/lib/note-ops'
import { draftKey, removeDraft } from '~/lib/storage'
import type { Change, Note, NoteContent, SaveValidation } from '~/lib/types'
import { useNotesStore } from '~/stores/notes'

export type EditorStatus = 'loading' | 'ready' | 'not-found' | 'deleted-elsewhere'

type TextTarget = 'title' | { todoId: string }

interface PendingText {
  target: TextTarget
  before: string
}

export const NEW_NOTE_PARAM = 'new'

function isSameTarget(a: TextTarget, b: TextTarget): boolean {
  if (a === 'title' || b === 'title') return a === b
  return a.todoId === b.todoId
}

export const useEditorStore = defineStore('editor', () => {
  const notes = useNotesStore()
  const history = createHistory<Change>()

  const noteId = ref('')
  const isNew = ref(false)
  const createdAt = ref(0)
  const status = ref<EditorStatus>('loading')
  const base = ref<NoteContent>(createEmptyContent())
  const current = ref<NoteContent>(createEmptyContent())
  const pendingText = shallowRef<PendingText | null>(null)
  const canUndo = ref(false)
  const canRedo = ref(false)

  const dirty = computed(() => !contentEquals(current.value, base.value))
  const hasOpenTextSession = computed(() => pendingText.value !== null)

  const textTimer = createDebouncedRunner(commitText, TEXT_COMMIT_DELAY_MS)

  function syncHistoryFlags(): void {
    canUndo.value = history.canUndo
    canRedo.value = history.canRedo
  }

  function resetSession(): void {
    textTimer.cancel()
    pendingText.value = null
    history.clear()
    syncHistoryFlags()
  }

  function currentDraftKey(): string {
    return draftKey(isNew.value ? NEW_NOTE_PARAM : noteId.value)
  }

  function open(idParam: string): void {
    resetSession()

    if (idParam === NEW_NOTE_PARAM) {
      noteId.value = createId()
      isNew.value = true
      createdAt.value = 0
      base.value = createEmptyContent()
      current.value = createEmptyContent()
      status.value = 'ready'
      return
    }

    const note = notes.getById(idParam)
    noteId.value = idParam
    isNew.value = false
    if (!note) {
      createdAt.value = 0
      base.value = createEmptyContent()
      current.value = createEmptyContent()
      status.value = 'not-found'
      return
    }

    createdAt.value = note.createdAt
    base.value = contentOf(note)
    current.value = cloneContent(base.value)
    status.value = 'ready'
  }

  function commitText(): void {
    textTimer.cancel()
    const session = pendingText.value
    pendingText.value = null
    if (!session) return

    if (session.target === 'title') {
      const after = current.value.title
      if (session.before !== after) {
        history.push({ type: 'title', before: session.before, after })
      }
    } else {
      const { todoId } = session.target
      const todo = current.value.todos.find((item) => item.id === todoId)
      if (todo && session.before !== todo.text) {
        history.push({ type: 'todo-text', todoId, before: session.before, after: todo.text })
      }
    }
    syncHistoryFlags()
  }

  function beginText(target: TextTarget, before: string): void {
    const session = pendingText.value
    if (session && !isSameTarget(session.target, target)) commitText()
    if (!pendingText.value) pendingText.value = { target, before }
    textTimer.schedule()
  }

  function setTitle(value: string): void {
    beginText('title', current.value.title)
    current.value.title = value
  }

  function setTodoText(todoId: string, value: string): void {
    const todo = current.value.todos.find((item) => item.id === todoId)
    if (!todo) return
    beginText({ todoId }, todo.text)
    todo.text = value
  }

  function record(change: Change): void {
    history.push(change)
    current.value = applyChange(current.value, change, 'redo')
    syncHistoryFlags()
  }

  function toggleTodo(todoId: string): void {
    commitText()
    const todo = current.value.todos.find((item) => item.id === todoId)
    if (!todo) return
    record({ type: 'todo-toggle', todoId, before: todo.done, after: !todo.done })
  }

  /** Добавляет пустой пункт после `afterIndex` (или в конец) и возвращает его id. */
  function addTodo(afterIndex?: number): string {
    commitText()
    const length = current.value.todos.length
    const index =
      afterIndex === undefined ? length : Math.max(0, Math.min(afterIndex + 1, length))
    const todo = createTodo()
    record({ type: 'todo-add', index, todo: cloneTodo(todo) })
    return todo.id
  }

  function removeTodo(todoId: string): void {
    commitText()
    const index = current.value.todos.findIndex((item) => item.id === todoId)
    const todo = current.value.todos[index]
    if (!todo) return
    record({ type: 'todo-remove', index, todo: cloneTodo(todo) })
  }

  function undo(): void {
    commitText()
    const change = history.undo()
    if (change) current.value = applyChange(current.value, change, 'undo')
    syncHistoryFlags()
  }

  function redo(): void {
    commitText()
    const change = history.redo()
    if (change) current.value = applyChange(current.value, change, 'redo')
    syncHistoryFlags()
  }

  function save(): SaveValidation {
    commitText()
    const validation = validateForSave(current.value)
    if (!validation.ok) return validation

    const normalized = normalizeForSave(current.value)
    const now = Date.now()
    const note: Note = {
      id: noteId.value,
      createdAt: isNew.value ? now : createdAt.value,
      updatedAt: now,
      ...normalized,
    }
    notes.upsert(note)

    const draftToRemove = currentDraftKey()
    createdAt.value = note.createdAt
    isNew.value = false
    base.value = cloneContent(normalized)
    current.value = cloneContent(normalized)
    resetSession()
    removeDraft(draftToRemove)
    return validation
  }

  function cancel(): void {
    resetSession()
    current.value = cloneContent(base.value)
    removeDraft(currentDraftKey())
  }

  return {
    noteId,
    isNew,
    status,
    base,
    current,
    dirty,
    canUndo,
    canRedo,
    hasOpenTextSession,
    open,
    setTitle,
    setTodoText,
    commitText,
    toggleTodo,
    addTodo,
    removeTodo,
    undo,
    redo,
    save,
    cancel,
  }
})
