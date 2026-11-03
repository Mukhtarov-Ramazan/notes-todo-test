import { DRAFT_KEY_PREFIX, NOTES_KEY, SCHEMA_VERSION } from './constants'
import { migrateData, type Migration, type StoredRecord } from './migrations'
import type { Note, NoteContent, StoredDraft, StoredNotes, TodoItem } from './types'

export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

function resolveStorage(storage?: StorageLike): StorageLike | null {
  try {
    return storage ?? globalThis.localStorage ?? null
  } catch {
    return null
  }
}

function readRaw(key: string, storage?: StorageLike): string | null {
  try {
    return resolveStorage(storage)?.getItem(key) ?? null
  } catch {
    return null
  }
}

function writeRaw(key: string, value: string, storage?: StorageLike): boolean {
  try {
    const target = resolveStorage(storage)
    if (!target) return false
    target.setItem(key, value)
    return true
  } catch {
    return false
  }
}

function removeRaw(key: string, storage?: StorageLike): void {
  try {
    resolveStorage(storage)?.removeItem(key)
  } catch {
    // нет доступа к storage, ничего не делаем
  }
}

function backupRaw(key: string, raw: string, storage?: StorageLike): void {
  writeRaw(`${key}:backup-${Date.now()}`, raw, storage)
}

function isRecord(value: unknown): value is StoredRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isTodoItem(value: unknown): value is TodoItem {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.text === 'string' &&
    typeof value.done === 'boolean'
  )
}

function isNoteContent(value: unknown): value is NoteContent {
  return (
    isRecord(value) &&
    typeof value.title === 'string' &&
    Array.isArray(value.todos) &&
    value.todos.every(isTodoItem)
  )
}

function isNote(value: unknown): value is Note {
  return (
    isNoteContent(value) &&
    isRecord(value) &&
    typeof value.id === 'string' &&
    value.id !== '' &&
    typeof value.createdAt === 'number' &&
    Number.isFinite(value.createdAt) &&
    typeof value.updatedAt === 'number' &&
    Number.isFinite(value.updatedAt)
  )
}

function isStoredDraft(value: unknown): value is StoredDraft {
  return (
    isRecord(value) &&
    typeof value.version === 'number' &&
    typeof value.noteId === 'string' &&
    typeof value.isNew === 'boolean' &&
    (value.baseUpdatedAt === null ||
      (typeof value.baseUpdatedAt === 'number' && Number.isFinite(value.baseUpdatedAt))) &&
    typeof value.savedAt === 'number' &&
    Number.isFinite(value.savedAt) &&
    isNoteContent(value.content)
  )
}

/**
 * Читает и проверяет данные по ключу, при необходимости мигрирует.
 * Если данные битые или от более новой версии, сохраняет копию в `<key>:backup-<время>` и вернёт `null`.
 */
function readVersioned(
  key: string,
  hasShape: (data: StoredRecord) => boolean,
  storage?: StorageLike,
  steps?: Record<number, Migration>,
): StoredRecord | null {
  const raw = readRaw(key, storage)
  if (raw === null) return null

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    backupRaw(key, raw, storage)
    return null
  }

  if (!isRecord(parsed) || typeof parsed.version !== 'number' || parsed.version > SCHEMA_VERSION) {
    backupRaw(key, raw, storage)
    return null
  }

  const migrated =
    parsed.version === SCHEMA_VERSION ? parsed : migrateData(parsed, parsed.version, steps)
  if (!migrated || !hasShape(migrated)) {
    backupRaw(key, raw, storage)
    return null
  }
  return migrated
}

export function draftKey(noteId: string): string {
  return `${DRAFT_KEY_PREFIX}${noteId}`
}

/** Невалидные заметки пропускаются, а если данные битые целиком, вернёт `[]`. */
export function loadNotes(storage?: StorageLike): Note[] {
  const data = readVersioned(NOTES_KEY, (d) => Array.isArray(d.notes), storage)
  if (!data || !Array.isArray(data.notes)) return []
  return data.notes.filter(isNote)
}

export function saveNotes(notes: Note[], storage?: StorageLike): boolean {
  const payload: StoredNotes = { version: SCHEMA_VERSION, notes }
  return writeRaw(NOTES_KEY, JSON.stringify(payload), storage)
}

export function loadDraft(key: string, storage?: StorageLike): StoredDraft | null {
  const data = readVersioned(key, isStoredDraft, storage)
  return data && isStoredDraft(data) ? data : null
}

export function saveDraft(draft: StoredDraft, storage?: StorageLike): boolean {
  return writeRaw(draftKey(draft.isNew ? 'new' : draft.noteId), JSON.stringify(draft), storage)
}

export function removeDraft(key: string, storage?: StorageLike): void {
  removeRaw(key, storage)
}
