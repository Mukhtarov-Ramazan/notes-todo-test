import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NOTES_KEY, SCHEMA_VERSION } from '~/lib/constants'
import { createDebouncedRunner } from '~/lib/debounce'
import { migrateData } from '~/lib/migrations'
import {
  draftKey,
  loadDraft,
  loadNotes,
  removeDraft,
  saveDraft,
  saveNotes,
  type StorageLike,
} from '~/lib/storage'
import type { Note, StoredDraft } from '~/lib/types'

function createMemoryStorage() {
  const data = new Map<string, string>()
  const storage: StorageLike = {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value)
    },
    removeItem: (key) => {
      data.delete(key)
    },
  }
  const backupKeys = (prefix: string) => [...data.keys()].filter((key) => key.startsWith(`${prefix}:backup-`))
  return { data, storage, backupKeys }
}

function makeNote(id: string, overrides: Partial<Note> = {}): Note {
  return {
    id,
    title: `Заметка ${id}`,
    todos: [{ id: `${id}-1`, text: 'Пункт', done: false }],
    createdAt: 1000,
    updatedAt: 2000,
    ...overrides,
  }
}

function makeDraft(overrides: Partial<StoredDraft> = {}): StoredDraft {
  return {
    version: SCHEMA_VERSION,
    noteId: 'n1',
    isNew: false,
    baseUpdatedAt: 2000,
    content: { title: 'Черновик', todos: [] },
    savedAt: 3000,
    ...overrides,
  }
}

describe('loadNotes / saveNotes', () => {
  it('возвращает пустой список для пустого хранилища', () => {
    const { storage } = createMemoryStorage()

    expect(loadNotes(storage)).toEqual([])
  })

  it('записывает и читает заметки', () => {
    const { storage } = createMemoryStorage()
    const notes = [makeNote('a'), makeNote('b')]

    expect(saveNotes(notes, storage)).toBe(true)
    expect(loadNotes(storage)).toEqual(notes)
  })

  it('сохраняет версию схемы', () => {
    const { storage, data } = createMemoryStorage()

    saveNotes([makeNote('a')], storage)

    const parsed = JSON.parse(data.get(NOTES_KEY) ?? '{}')
    expect(parsed.version).toBe(SCHEMA_VERSION)
  })

  it('при битом JSON делает бэкап и возвращает []', () => {
    const { storage, data, backupKeys } = createMemoryStorage()
    data.set(NOTES_KEY, '{битый json')

    expect(loadNotes(storage)).toEqual([])

    const backups = backupKeys(NOTES_KEY)
    expect(backups).toHaveLength(1)
    expect(data.get(backups[0]!)).toBe('{битый json')
  })

  it('при неверной форме данных делает бэкап и возвращает []', () => {
    const { storage, data, backupKeys } = createMemoryStorage()
    data.set(NOTES_KEY, JSON.stringify({ version: SCHEMA_VERSION, notes: 'не массив' }))

    expect(loadNotes(storage)).toEqual([])
    expect(backupKeys(NOTES_KEY)).toHaveLength(1)
  })

  it('пропускает невалидные заметки и оставляет валидные', () => {
    const { storage, data } = createMemoryStorage()
    const valid = makeNote('ok')
    data.set(
      NOTES_KEY,
      JSON.stringify({
        version: SCHEMA_VERSION,
        notes: [valid, { id: 'x' }, null, makeNote('', {}), { ...valid, id: 'bad', todos: [{ id: 1 }] }],
      }),
    )

    expect(loadNotes(storage)).toEqual([valid])
  })

  it('при версии новее текущей делает бэкап и возвращает []', () => {
    const { storage, data, backupKeys } = createMemoryStorage()
    data.set(NOTES_KEY, JSON.stringify({ version: SCHEMA_VERSION + 1, notes: [makeNote('a')] }))

    expect(loadNotes(storage)).toEqual([])
    expect(backupKeys(NOTES_KEY)).toHaveLength(1)
  })

  it('при старой версии без нужной миграции делает бэкап и возвращает []', () => {
    const { storage, data, backupKeys } = createMemoryStorage()
    data.set(NOTES_KEY, JSON.stringify({ version: 0, notes: [makeNote('a')] }))

    expect(loadNotes(storage)).toEqual([])
    expect(backupKeys(NOTES_KEY)).toHaveLength(1)
  })

  it('не бросает исключений при недоступном хранилище', () => {
    const broken: StorageLike = {
      getItem: () => {
        throw new Error('denied')
      },
      setItem: () => {
        throw new Error('quota')
      },
      removeItem: () => {
        throw new Error('denied')
      },
    }

    expect(loadNotes(broken)).toEqual([])
    expect(saveNotes([makeNote('a')], broken)).toBe(false)
    expect(loadDraft(draftKey('n1'), broken)).toBeNull()
    expect(saveDraft(makeDraft(), broken)).toBe(false)
    expect(() => removeDraft(draftKey('n1'), broken)).not.toThrow()
  })
})

describe('migrateData', () => {
  it('прогоняет данные по цепочке миграций и ставит новую версию', () => {
    const steps = {
      1: (data: Record<string, unknown>) => ({ ...data, fromOne: true }),
      2: (data: Record<string, unknown>) => ({ ...data, fromTwo: true }),
    }

    const result = migrateData({ version: 1, notes: [] }, 1, steps, 3)

    expect(result).toEqual({ version: 3, notes: [], fromOne: true, fromTwo: true })
  })

  it('возвращает null, если в цепочке нет звена', () => {
    expect(migrateData({ version: 1 }, 1, {}, 2)).toBeNull()
  })
})

describe('черновики', () => {
  it('записывает, читает и удаляет черновик', () => {
    const { storage } = createMemoryStorage()
    const draft = makeDraft()

    expect(saveDraft(draft, storage)).toBe(true)
    expect(loadDraft(draftKey('n1'), storage)).toEqual(draft)

    removeDraft(draftKey('n1'), storage)
    expect(loadDraft(draftKey('n1'), storage)).toBeNull()
  })

  it('хранит черновик новой заметки под ключом new', () => {
    const { storage, data } = createMemoryStorage()

    saveDraft(makeDraft({ noteId: 'generated', isNew: true, baseUpdatedAt: null }), storage)

    expect(data.has(draftKey('new'))).toBe(true)
    expect(data.has(draftKey('generated'))).toBe(false)
  })

  it('невалидный черновик превращает в null и делает бэкап', () => {
    const { storage, data, backupKeys } = createMemoryStorage()
    const key = draftKey('n1')
    data.set(key, JSON.stringify({ version: SCHEMA_VERSION, noteId: 'n1' }))

    expect(loadDraft(key, storage)).toBeNull()
    expect(backupKeys(key)).toHaveLength(1)
  })
})

describe('createDebouncedRunner', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('схлопывает серию вызовов в один', () => {
    const fn = vi.fn()
    const runner = createDebouncedRunner(fn, 500)

    runner.schedule()
    vi.advanceTimersByTime(300)
    runner.schedule()
    vi.advanceTimersByTime(300)
    expect(fn).not.toHaveBeenCalled()

    vi.advanceTimersByTime(200)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(runner.isPending()).toBe(false)
  })

  it('flush выполняет отложенный вызов сразу и только один раз', () => {
    const fn = vi.fn()
    const runner = createDebouncedRunner(fn, 500)

    runner.schedule()
    expect(runner.isPending()).toBe(true)
    runner.flush()
    expect(fn).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(1000)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('flush без запланированного вызова ничего не делает', () => {
    const fn = vi.fn()
    const runner = createDebouncedRunner(fn, 500)

    runner.flush()

    expect(fn).not.toHaveBeenCalled()
  })

  it('cancel отменяет отложенный вызов', () => {
    const fn = vi.fn()
    const runner = createDebouncedRunner(fn, 500)

    runner.schedule()
    runner.cancel()
    vi.advanceTimersByTime(1000)

    expect(fn).not.toHaveBeenCalled()
    expect(runner.isPending()).toBe(false)
  })
})
