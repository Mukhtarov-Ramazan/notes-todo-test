import { describe, expect, it } from 'vitest'
import {
  TITLE_REQUIRED_MESSAGE,
  applyChange,
  cloneContent,
  contentEquals,
  createId,
  normalizeForSave,
  validateForSave,
} from '~/lib/note-ops'
import type { Change, NoteContent } from '~/lib/types'

function makeContent(): NoteContent {
  return {
    title: 'Список',
    todos: [
      { id: 'a', text: 'Молоко', done: false },
      { id: 'b', text: 'Хлеб', done: true },
      { id: 'c', text: 'Сыр', done: false },
    ],
  }
}

describe('applyChange', () => {
  const changes: { name: string; change: Change; after: NoteContent }[] = [
    {
      name: 'title',
      change: { type: 'title', before: 'Список', after: 'Покупки' },
      after: { ...makeContent(), title: 'Покупки' },
    },
    {
      name: 'todo-text',
      change: { type: 'todo-text', todoId: 'a', before: 'Молоко', after: 'Кефир' },
      after: {
        title: 'Список',
        todos: [
          { id: 'a', text: 'Кефир', done: false },
          { id: 'b', text: 'Хлеб', done: true },
          { id: 'c', text: 'Сыр', done: false },
        ],
      },
    },
    {
      name: 'todo-toggle',
      change: { type: 'todo-toggle', todoId: 'a', before: false, after: true },
      after: {
        title: 'Список',
        todos: [
          { id: 'a', text: 'Молоко', done: true },
          { id: 'b', text: 'Хлеб', done: true },
          { id: 'c', text: 'Сыр', done: false },
        ],
      },
    },
    {
      name: 'todo-add',
      change: { type: 'todo-add', index: 1, todo: { id: 'n', text: 'Яйца', done: false } },
      after: {
        title: 'Список',
        todos: [
          { id: 'a', text: 'Молоко', done: false },
          { id: 'n', text: 'Яйца', done: false },
          { id: 'b', text: 'Хлеб', done: true },
          { id: 'c', text: 'Сыр', done: false },
        ],
      },
    },
    {
      name: 'todo-remove',
      change: { type: 'todo-remove', index: 1, todo: { id: 'b', text: 'Хлеб', done: true } },
      after: {
        title: 'Список',
        todos: [
          { id: 'a', text: 'Молоко', done: false },
          { id: 'c', text: 'Сыр', done: false },
        ],
      },
    },
  ]

  describe.each(changes)('$name', ({ change, after }) => {
    it('redo и undo дают нужное содержимое', () => {
      const before = makeContent()

      const redone = applyChange(before, change, 'redo')
      expect(redone).toEqual(after)

      const undone = applyChange(redone, change, 'undo')
      expect(undone).toEqual(before)
    })

    it('не изменяет исходный объект', () => {
      const source = makeContent()
      const snapshot = cloneContent(source)

      const result = applyChange(source, change, 'redo')

      expect(source).toEqual(snapshot)
      expect(result).not.toBe(source)
      expect(result.todos).not.toBe(source.todos)
    })
  })

  it('последовательность изменений полностью откатывается в обратном порядке', () => {
    const original = makeContent()
    const sequence: Change[] = [
      { type: 'title', before: 'Список', after: 'Покупки' },
      { type: 'todo-toggle', todoId: 'a', before: false, after: true },
      { type: 'todo-remove', index: 1, todo: { id: 'b', text: 'Хлеб', done: true } },
      { type: 'todo-add', index: 0, todo: { id: 'n', text: 'Яйца', done: false } },
    ]

    const final = sequence.reduce((acc, change) => applyChange(acc, change, 'redo'), original)
    expect(final).not.toEqual(original)

    const restored = [...sequence]
      .reverse()
      .reduce((acc, change) => applyChange(acc, change, 'undo'), final)
    expect(restored).toEqual(original)
  })

  it('является безопасным no-op для неизвестного todoId', () => {
    const content = makeContent()
    const unknownText: Change = { type: 'todo-text', todoId: 'zzz', before: 'x', after: 'y' }
    const unknownToggle: Change = { type: 'todo-toggle', todoId: 'zzz', before: false, after: true }

    expect(applyChange(content, unknownText, 'redo')).toEqual(content)
    expect(applyChange(content, unknownToggle, 'undo')).toEqual(content)
  })

  it('не дублирует пункт при повторном todo-add с тем же id', () => {
    const content = makeContent()
    const change: Change = { type: 'todo-add', index: 0, todo: { id: 'a', text: 'Молоко', done: false } }

    expect(applyChange(content, change, 'redo').todos).toHaveLength(3)
  })
})

describe('contentEquals', () => {
  it('считает равными одинаковое содержимое', () => {
    expect(contentEquals(makeContent(), makeContent())).toBe(true)
  })

  it('замечает отличие в заголовке, тексте, отметке, id и количестве', () => {
    const base = makeContent()

    expect(contentEquals(base, { ...makeContent(), title: 'Другое' })).toBe(false)

    const text = makeContent()
    text.todos[0]!.text = 'Другое'
    expect(contentEquals(base, text)).toBe(false)

    const done = makeContent()
    done.todos[0]!.done = true
    expect(contentEquals(base, done)).toBe(false)

    const id = makeContent()
    id.todos[0]!.id = 'zzz'
    expect(contentEquals(base, id)).toBe(false)

    const shorter = makeContent()
    shorter.todos.pop()
    expect(contentEquals(base, shorter)).toBe(false)
  })

  it('учитывает порядок пунктов', () => {
    const reversed = makeContent()
    reversed.todos.reverse()

    expect(contentEquals(makeContent(), reversed)).toBe(false)
  })
})

describe('normalizeForSave', () => {
  it('обрезает пробелы и отбрасывает пустые пункты', () => {
    const result = normalizeForSave({
      title: '  Заголовок  ',
      todos: [
        { id: '1', text: '  Купить  ', done: true },
        { id: '2', text: '   ', done: false },
        { id: '3', text: '', done: false },
      ],
    })

    expect(result).toEqual({
      title: 'Заголовок',
      todos: [{ id: '1', text: 'Купить', done: true }],
    })
  })
})

describe('validateForSave', () => {
  it('возвращает ошибку для пустого заголовка и заголовка из пробелов', () => {
    const expected = { ok: false, titleError: TITLE_REQUIRED_MESSAGE }

    expect(validateForSave({ title: '', todos: [] })).toEqual(expected)
    expect(validateForSave({ title: '   ', todos: [] })).toEqual(expected)
  })

  it('пропускает непустой заголовок', () => {
    expect(validateForSave({ title: 'Заметка', todos: [] })).toEqual({ ok: true })
  })
})

describe('createId', () => {
  it('создаёт уникальные непустые id', () => {
    const ids = new Set(Array.from({ length: 100 }, () => createId()))

    expect(ids.size).toBe(100)
    expect([...ids].every((id) => id !== '')).toBe(true)
  })
})
