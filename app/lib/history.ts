import { HISTORY_LIMIT } from './constants'

export interface History<C> {
  push(change: C): void
  undo(): C | null
  redo(): C | null
  clear(): void
  readonly canUndo: boolean
  readonly canRedo: boolean
  readonly undoSize: number
  readonly redoSize: number
}

export interface HistoryOptions {
  limit?: number
}

/** Хранит патчи, а не копии заметки. Когда лимит превышен, старые записи выпадают. */
export function createHistory<C>(options: HistoryOptions = {}): History<C> {
  const limit = Math.max(1, options.limit ?? HISTORY_LIMIT)
  let undoStack: C[] = []
  let redoStack: C[] = []

  return {
    push(change) {
      undoStack.push(change)
      redoStack = []
      if (undoStack.length > limit) undoStack.shift()
    },
    undo() {
      const change = undoStack.pop()
      if (change === undefined) return null
      redoStack.push(change)
      return change
    },
    redo() {
      const change = redoStack.pop()
      if (change === undefined) return null
      undoStack.push(change)
      return change
    },
    clear() {
      undoStack = []
      redoStack = []
    },
    get canUndo() {
      return undoStack.length > 0
    },
    get canRedo() {
      return redoStack.length > 0
    },
    get undoSize() {
      return undoStack.length
    },
    get redoSize() {
      return redoStack.length
    },
  }
}
