import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { NOTES_KEY, SCHEMA_VERSION } from '~/lib/constants'
import { draftKey, loadNotes, saveNotes } from '~/lib/storage'
import type { Note } from '~/lib/types'
import { useNotesStore } from '~/stores/notes'

function makeNote(id: string, updatedAt: number, title = `Заметка ${id}`): Note {
  return { id, title, todos: [], createdAt: 1, updatedAt }
}

describe('notes store', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('init читает заметки из хранилища и идемпотентен', () => {
    saveNotes([makeNote('a', 1)])
    const store = useNotesStore()

    store.init()
    expect(store.loaded).toBe(true)
    expect(store.notes).toHaveLength(1)

    saveNotes([makeNote('a', 1), makeNote('b', 2)])
    store.init()
    expect(store.notes).toHaveLength(1)
  })

  it('upsert добавляет заметку и сразу пишет в storage', () => {
    const store = useNotesStore()
    store.init()

    store.upsert(makeNote('a', 1))

    expect(store.getById('a')?.title).toBe('Заметка a')
    expect(loadNotes()).toHaveLength(1)
    expect(JSON.parse(localStorage.getItem(NOTES_KEY) ?? '{}').version).toBe(SCHEMA_VERSION)
  })

  it('upsert заменяет существующую заметку, а не дублирует её', () => {
    const store = useNotesStore()
    store.init()
    store.upsert(makeNote('a', 1, 'Старое'))

    store.upsert(makeNote('a', 2, 'Новое'))

    expect(store.notes).toHaveLength(1)
    expect(store.getById('a')?.title).toBe('Новое')
    expect(loadNotes()[0]?.title).toBe('Новое')
  })

  it('remove удаляет заметку из стора, из storage и её черновик', () => {
    const store = useNotesStore()
    store.init()
    store.upsert(makeNote('a', 1))
    store.upsert(makeNote('b', 2))
    localStorage.setItem(draftKey('a'), 'draft')

    store.remove('a')

    expect(store.getById('a')).toBeUndefined()
    expect(loadNotes().map((note) => note.id)).toEqual(['b'])
    expect(localStorage.getItem(draftKey('a'))).toBeNull()
  })

  it('reloadFromStorage подхватывает внешние изменения', () => {
    const store = useNotesStore()
    store.init()
    store.upsert(makeNote('a', 1))

    saveNotes([makeNote('a', 1), makeNote('external', 5)])
    store.reloadFromStorage()

    expect(store.notes.map((note) => note.id)).toEqual(['a', 'external'])
  })

  it('reloadFromStorage отражает удаление заметки в другой вкладке', () => {
    const store = useNotesStore()
    store.init()
    store.upsert(makeNote('a', 1))

    saveNotes([])
    store.reloadFromStorage()

    expect(store.getById('a')).toBeUndefined()
  })

  it('sortedNotes сортирует по updatedAt по убыванию и не меняет исходный массив', () => {
    const store = useNotesStore()
    store.init()
    store.upsert(makeNote('old', 1))
    store.upsert(makeNote('new', 3))
    store.upsert(makeNote('mid', 2))

    expect(store.sortedNotes.map((note) => note.id)).toEqual(['new', 'mid', 'old'])
    expect(store.notes.map((note) => note.id)).toEqual(['old', 'new', 'mid'])
  })

  it('при ошибке записи выставляет persistError и не бросает исключение', () => {
    const store = useNotesStore()
    store.init()
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      removeItem: () => undefined,
      setItem: () => {
        throw new Error('quota')
      },
    })

    expect(() => store.upsert(makeNote('a', 1))).not.toThrow()
    expect(store.persistError).toBe(true)
    expect(store.getById('a')).toBeDefined()
  })
})
