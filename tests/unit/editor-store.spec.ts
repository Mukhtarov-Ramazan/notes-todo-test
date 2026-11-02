import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import {
  DRAFT_SAVE_DELAY_MS,
  HISTORY_LIMIT,
  SCHEMA_VERSION,
  TEXT_COMMIT_DELAY_MS,
} from '~/lib/constants'
import { draftKey, loadDraft, saveDraft, type StorageLike } from '~/lib/storage'
import type { Note, StoredDraft } from '~/lib/types'
import { useEditorStore } from '~/stores/editor'
import { useNotesStore } from '~/stores/notes'

let setItemCalls: string[] = []
let data: Map<string, string>

function stubStorage(): void {
  data = new Map<string, string>()
  setItemCalls = []
  const storage: StorageLike = {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      setItemCalls.push(key)
      data.set(key, value)
    },
    removeItem: (key) => {
      data.delete(key)
    },
  }
  vi.stubGlobal('localStorage', storage)
}

function makeNote(): Note {
  return {
    id: 'n1',
    title: 'Покупки',
    todos: [
      { id: 't1', text: 'Молоко', done: false },
      { id: 't2', text: 'Хлеб', done: false },
    ],
    createdAt: 100,
    updatedAt: 200,
  }
}

function setup(seed: Note[] = [makeNote()]) {
  const notes = useNotesStore()
  notes.init()
  seed.forEach((note) => notes.upsert(note))
  setItemCalls = []
  const editor = useEditorStore()
  return { notes, editor }
}

function undoAll(editor: ReturnType<typeof useEditorStore>): number {
  let steps = 0
  while (editor.canUndo) {
    editor.undo()
    steps++
  }
  return steps
}

describe('editor store', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    stubStorage()
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  describe('история текстового ввода', () => {
    it('непрерывный ввод по паузе даёт одну запись', () => {
      const { editor } = setup()
      editor.open('n1')

      editor.setTitle('Покупки 1')
      editor.setTitle('Покупки 12')
      editor.setTitle('Покупки 123')
      vi.advanceTimersByTime(TEXT_COMMIT_DELAY_MS)

      expect(undoAll(editor)).toBe(1)
      expect(editor.current.title).toBe('Покупки')
    })

    it('commitText закрывает сессию: набор, blur, набор дают две записи', () => {
      const { editor } = setup()
      editor.open('n1')

      editor.setTitle('A')
      editor.commitText()
      editor.setTitle('AB')
      editor.commitText()

      expect(undoAll(editor)).toBe(2)
      expect(editor.current.title).toBe('Покупки')
    })

    it('переход к другому полю закрывает предыдущую сессию', () => {
      const { editor } = setup()
      editor.open('n1')

      editor.setTitle('Новое')
      editor.setTodoText('t1', 'Кефир')
      editor.commitText()

      editor.undo()
      expect(editor.current.todos[0]?.text).toBe('Молоко')
      expect(editor.current.title).toBe('Новое')
      editor.undo()
      expect(editor.current.title).toBe('Покупки')
    })

    it('не создаёт запись, если текст вернулся к прежнему значению', () => {
      const { editor } = setup()
      editor.open('n1')

      editor.setTitle('Покупки!')
      editor.setTitle('Покупки')
      editor.commitText()

      expect(editor.canUndo).toBe(false)
    })

    it('hasOpenTextSession отражает открытую сессию', () => {
      const { editor } = setup()
      editor.open('n1')
      expect(editor.hasOpenTextSession).toBe(false)

      editor.setTitle('x')
      expect(editor.hasOpenTextSession).toBe(true)

      editor.commitText()
      expect(editor.hasOpenTextSession).toBe(false)
    })
  })

  describe('атомарные изменения и undo/redo', () => {
    it('toggle, add и remove — по одной записи', () => {
      const { editor } = setup()
      editor.open('n1')

      editor.toggleTodo('t1')
      const newId = editor.addTodo()
      editor.removeTodo('t2')

      expect(editor.current.todos.map((todo) => todo.id)).toEqual(['t1', newId])
      expect(undoAll(editor)).toBe(3)
      expect(editor.current).toEqual({ title: 'Покупки', todos: makeNote().todos })
    })

    it('redo повторяет отменённые изменения в прямом порядке', () => {
      const { editor } = setup()
      editor.open('n1')
      editor.toggleTodo('t1')
      editor.removeTodo('t2')

      editor.undo()
      editor.undo()
      expect(editor.canRedo).toBe(true)

      editor.redo()
      expect(editor.current.todos[0]?.done).toBe(true)
      expect(editor.current.todos).toHaveLength(2)
      editor.redo()
      expect(editor.current.todos).toHaveLength(1)
      expect(editor.canRedo).toBe(false)
    })

    it('новое изменение после undo очищает redo', () => {
      const { editor } = setup()
      editor.open('n1')
      editor.toggleTodo('t1')
      editor.undo()
      expect(editor.canRedo).toBe(true)

      editor.toggleTodo('t2')

      expect(editor.canRedo).toBe(false)
    })

    it('addTodo вставляет пункт после указанного индекса', () => {
      const { editor } = setup()
      editor.open('n1')

      const id = editor.addTodo(0)

      expect(editor.current.todos.map((todo) => todo.id)).toEqual(['t1', id, 't2'])
    })

    it('ограничивает историю 50 шагами', () => {
      const { editor } = setup()
      editor.open('n1')

      for (let i = 0; i < HISTORY_LIMIT + 10; i++) editor.toggleTodo('t1')

      expect(undoAll(editor)).toBe(HISTORY_LIMIT)
    })

    it('undo перед отменой закрывает открытую текстовую сессию', () => {
      const { editor } = setup()
      editor.open('n1')

      editor.setTitle('Правка')
      editor.undo()

      expect(editor.current.title).toBe('Покупки')
      expect(editor.canRedo).toBe(true)
    })
  })

  describe('dirty, save и cancel', () => {
    it('dirty снова false после отката всех изменений', () => {
      const { editor } = setup()
      editor.open('n1')
      expect(editor.dirty).toBe(false)

      editor.toggleTodo('t1')
      editor.setTitle('Другое')
      editor.commitText()
      expect(editor.dirty).toBe(true)

      undoAll(editor)
      expect(editor.dirty).toBe(false)
    })

    it('save сохраняет заметку, сбрасывает историю и dirty', () => {
      const { editor, notes } = setup()
      editor.open('n1')
      editor.toggleTodo('t1')
      editor.undo()
      editor.setTitle('  Новое имя  ')

      const result = editor.save()

      expect(result.ok).toBe(true)
      expect(notes.getById('n1')?.title).toBe('Новое имя')
      expect(editor.dirty).toBe(false)
      expect(editor.canUndo).toBe(false)
      expect(editor.canRedo).toBe(false)
      expect(editor.hasOpenTextSession).toBe(false)
    })

    it('save отбрасывает пустые пункты', () => {
      const { editor, notes } = setup()
      editor.open('n1')
      editor.setTodoText('t2', '   ')

      editor.save()

      expect(notes.getById('n1')?.todos.map((todo) => todo.id)).toEqual(['t1'])
    })

    it('save с пустым заголовком возвращает ошибку и ничего не пишет', () => {
      const { editor, notes } = setup()
      editor.open('new')

      const result = editor.save()

      expect(result.ok).toBe(false)
      expect(notes.notes).toHaveLength(1)
      expect(editor.isNew).toBe(true)
    })

    it('save новой заметки создаёт её с id редактора', () => {
      const { editor, notes } = setup()
      editor.open('new')
      const id = editor.noteId
      editor.setTitle('Новая')

      editor.save()

      expect(editor.isNew).toBe(false)
      expect(notes.getById(id)?.title).toBe('Новая')
    })

    it('cancel возвращает сохранённую версию и сбрасывает историю', () => {
      const { editor } = setup()
      editor.open('n1')
      editor.toggleTodo('t1')
      editor.setTitle('Черновое')

      editor.cancel()

      expect(editor.current.title).toBe('Покупки')
      expect(editor.current.todos[0]?.done).toBe(false)
      expect(editor.dirty).toBe(false)
      expect(editor.canUndo).toBe(false)
      expect(editor.canRedo).toBe(false)
    })
  })

  describe('черновик', () => {
    it('пишется один раз после debounce, а не на каждый символ', async () => {
      const { editor } = setup()
      editor.open('n1')

      for (const title of ['П', 'По', 'Поч', 'Почт', 'Почта']) {
        editor.setTitle(title)
        await nextTick()
        vi.advanceTimersByTime(DRAFT_SAVE_DELAY_MS / 5)
      }
      expect(setItemCalls).toHaveLength(0)

      vi.advanceTimersByTime(DRAFT_SAVE_DELAY_MS)

      expect(setItemCalls).toEqual([draftKey('n1')])
      expect(loadDraft(draftKey('n1'))?.content.title).toBe('Почта')
    })

    it('flushDraft записывает черновик сразу', async () => {
      const { editor } = setup()
      editor.open('n1')
      editor.setTitle('Срочно')
      await nextTick()

      editor.flushDraft()

      expect(loadDraft(draftKey('n1'))?.content.title).toBe('Срочно')
    })

    it('удаляет черновик, когда изменения откатились', async () => {
      const { editor } = setup()
      editor.open('n1')
      editor.toggleTodo('t1')
      await nextTick()
      editor.flushDraft()
      expect(data.has(draftKey('n1'))).toBe(true)

      editor.undo()
      await nextTick()

      expect(data.has(draftKey('n1'))).toBe(false)
    })

    it('save и cancel удаляют черновик', async () => {
      const { editor } = setup()
      editor.open('n1')
      editor.toggleTodo('t1')
      await nextTick()
      editor.flushDraft()

      editor.save()
      expect(data.has(draftKey('n1'))).toBe(false)

      editor.toggleTodo('t1')
      await nextTick()
      editor.flushDraft()
      expect(data.has(draftKey('n1'))).toBe(true)

      editor.cancel()
      expect(data.has(draftKey('n1'))).toBe(false)
    })

    function makeDraft(title: string): StoredDraft {
      return {
        version: SCHEMA_VERSION,
        noteId: 'n1',
        isNew: false,
        baseUpdatedAt: 200,
        content: { title, todos: [{ id: 't1', text: 'Молоко', done: true }] },
        savedAt: 300,
      }
    }

    it('open находит отличающийся черновик и ждёт решения', () => {
      const { editor } = setup()
      saveDraft(makeDraft('Из черновика'))

      editor.open('n1')

      expect(editor.pendingDraft?.content.title).toBe('Из черновика')
      expect(editor.current.title).toBe('Покупки')
    })

    it('restoreDraft подставляет черновик и оставляет историю пустой', () => {
      const { editor } = setup()
      saveDraft(makeDraft('Из черновика'))
      editor.open('n1')

      editor.restoreDraft()

      expect(editor.pendingDraft).toBeNull()
      expect(editor.current.title).toBe('Из черновика')
      expect(editor.dirty).toBe(true)
      expect(editor.canUndo).toBe(false)
    })

    it('discardDraft удаляет черновик и не меняет содержимое', () => {
      const { editor } = setup()
      saveDraft(makeDraft('Из черновика'))
      editor.open('n1')

      editor.discardDraft()

      expect(editor.pendingDraft).toBeNull()
      expect(data.has(draftKey('n1'))).toBe(false)
      expect(editor.current.title).toBe('Покупки')
    })

    it('черновик, равный сохранённой версии, удаляется молча', () => {
      const { editor } = setup()
      const note = makeNote()
      saveDraft({ ...makeDraft(note.title), content: { title: note.title, todos: note.todos } })

      editor.open('n1')

      expect(editor.pendingDraft).toBeNull()
      expect(data.has(draftKey('n1'))).toBe(false)
    })
  })

  describe('статусы', () => {
    it('для неизвестного id ставит not-found', () => {
      const { editor } = setup()

      editor.open('missing')

      expect(editor.status).toBe('not-found')
    })

    it('для существующей заметки и для new ставит ready', () => {
      const { editor } = setup()

      editor.open('n1')
      expect(editor.status).toBe('ready')

      editor.open('new')
      expect(editor.status).toBe('ready')
      expect(editor.isNew).toBe(true)
    })

    it('при удалении открытой заметки ставит deleted-elsewhere и убирает черновик', async () => {
      const { editor, notes } = setup()
      editor.open('n1')
      editor.toggleTodo('t1')
      await nextTick()
      editor.flushDraft()
      expect(data.has(draftKey('n1'))).toBe(true)

      notes.remove('n1')
      await nextTick()

      expect(editor.status).toBe('deleted-elsewhere')
      expect(data.has(draftKey('n1'))).toBe(false)
    })

    it('saveAsNew воссоздаёт удалённую заметку с тем же id', async () => {
      const { editor, notes } = setup()
      editor.open('n1')
      editor.setTitle('Спасённая')
      notes.remove('n1')
      await nextTick()

      const result = editor.saveAsNew()

      expect(result.ok).toBe(true)
      expect(editor.status).toBe('ready')
      expect(notes.getById('n1')?.title).toBe('Спасённая')
    })
  })
})
