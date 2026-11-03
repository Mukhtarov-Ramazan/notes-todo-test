import type {
  Change,
  ChangeDirection,
  Note,
  NoteContent,
  SaveValidation,
  TodoItem,
} from './types'

export const TITLE_REQUIRED_MESSAGE = 'Введите название заметки'

/** Запасной вариант нужен, потому что в небезопасном контексте `crypto.randomUUID` недоступен. */
export function createId(): string {
  const cryptoApi = globalThis.crypto
  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
    return cryptoApi.randomUUID()
  }
  const random = () => Math.random().toString(36).slice(2, 10)
  return `${Date.now().toString(36)}-${random()}-${random()}`
}

export function createTodo(text = '', done = false): TodoItem {
  return { id: createId(), text, done }
}

export function createEmptyContent(): NoteContent {
  return { title: '', todos: [] }
}

export function cloneTodo(todo: TodoItem): TodoItem {
  return { id: todo.id, text: todo.text, done: todo.done }
}

export function cloneContent(content: NoteContent): NoteContent {
  return { title: content.title, todos: content.todos.map(cloneTodo) }
}

export function contentOf(note: Note): NoteContent {
  return cloneContent(note)
}

export function contentEquals(a: NoteContent, b: NoteContent): boolean {
  if (a.title !== b.title || a.todos.length !== b.todos.length) return false
  return a.todos.every((todo, i) => {
    const other = b.todos[i]
    return (
      other !== undefined &&
      todo.id === other.id &&
      todo.text === other.text &&
      todo.done === other.done
    )
  })
}

function insertTodo(todos: TodoItem[], index: number, todo: TodoItem): TodoItem[] {
  if (todos.some((t) => t.id === todo.id)) return todos.map(cloneTodo)
  const at = Math.max(0, Math.min(index, todos.length))
  const result = todos.map(cloneTodo)
  result.splice(at, 0, cloneTodo(todo))
  return result
}

function withoutTodo(todos: TodoItem[], todoId: string): TodoItem[] {
  return todos.filter((t) => t.id !== todoId).map(cloneTodo)
}

/** Возвращает новый объект. Если пункта с таким `todoId` нет, содержимое не меняется. */
export function applyChange(
  content: NoteContent,
  change: Change,
  direction: ChangeDirection,
): NoteContent {
  const isUndo = direction === 'undo'

  switch (change.type) {
    case 'title':
      return {
        title: isUndo ? change.before : change.after,
        todos: content.todos.map(cloneTodo),
      }
    case 'todo-text': {
      const text = isUndo ? change.before : change.after
      return {
        title: content.title,
        todos: content.todos.map((t) =>
          t.id === change.todoId ? { ...cloneTodo(t), text } : cloneTodo(t),
        ),
      }
    }
    case 'todo-toggle': {
      const done = isUndo ? change.before : change.after
      return {
        title: content.title,
        todos: content.todos.map((t) =>
          t.id === change.todoId ? { ...cloneTodo(t), done } : cloneTodo(t),
        ),
      }
    }
    case 'todo-add':
      return {
        title: content.title,
        todos: isUndo
          ? withoutTodo(content.todos, change.todo.id)
          : insertTodo(content.todos, change.index, change.todo),
      }
    case 'todo-remove':
      return {
        title: content.title,
        todos: isUndo
          ? insertTodo(content.todos, change.index, change.todo)
          : withoutTodo(content.todos, change.todo.id),
      }
  }
}

/** Убирает пробелы по краям и выкидывает пустые пункты. */
export function normalizeForSave(content: NoteContent): NoteContent {
  return {
    title: content.title.trim(),
    todos: content.todos
      .map((t) => ({ id: t.id, text: t.text.trim(), done: t.done }))
      .filter((t) => t.text !== ''),
  }
}

export function validateForSave(content: NoteContent): SaveValidation {
  if (content.title.trim() === '') {
    return { ok: false, titleError: TITLE_REQUIRED_MESSAGE }
  }
  return { ok: true }
}
