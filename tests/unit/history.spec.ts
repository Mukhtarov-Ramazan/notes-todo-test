import { describe, expect, it } from 'vitest'
import { HISTORY_LIMIT } from '~/lib/constants'
import { createHistory } from '~/lib/history'

describe('createHistory', () => {
  it('возвращает записи в обратном порядке при undo и в прямом при redo', () => {
    const history = createHistory<number>()
    history.push(1)
    history.push(2)
    history.push(3)

    expect(history.undo()).toBe(3)
    expect(history.undo()).toBe(2)
    expect(history.redo()).toBe(2)
    expect(history.redo()).toBe(3)
  })

  it('возвращает null на пустых стеках', () => {
    const history = createHistory<number>()

    expect(history.undo()).toBeNull()
    expect(history.redo()).toBeNull()
  })

  it('очищает redo-стек при новой записи после undo', () => {
    const history = createHistory<string>()
    history.push('a')
    history.push('b')
    history.undo()
    expect(history.canRedo).toBe(true)

    history.push('c')

    expect(history.canRedo).toBe(false)
    expect(history.redo()).toBeNull()
    expect(history.undo()).toBe('c')
    expect(history.undo()).toBe('a')
  })

  it('хранит не больше 50 записей и теряет самые старые', () => {
    const history = createHistory<number>()
    for (let i = 1; i <= 60; i++) history.push(i)

    expect(HISTORY_LIMIT).toBe(50)
    expect(history.undoSize).toBe(50)

    const undone: number[] = []
    let change = history.undo()
    while (change !== null) {
      undone.push(change)
      change = history.undo()
    }

    expect(undone).toHaveLength(50)
    expect(undone[0]).toBe(60)
    expect(undone[49]).toBe(11)
  })

  it('учитывает лимит из options', () => {
    const history = createHistory<number>({ limit: 2 })
    history.push(1)
    history.push(2)
    history.push(3)

    expect(history.undoSize).toBe(2)
    expect(history.undo()).toBe(3)
    expect(history.undo()).toBe(2)
    expect(history.undo()).toBeNull()
  })

  it('очищает оба стека через clear', () => {
    const history = createHistory<number>()
    history.push(1)
    history.push(2)
    history.undo()

    history.clear()

    expect(history.canUndo).toBe(false)
    expect(history.canRedo).toBe(false)
    expect(history.undoSize).toBe(0)
    expect(history.redoSize).toBe(0)
  })

  it('обновляет canUndo и canRedo после операций', () => {
    const history = createHistory<number>()
    expect(history.canUndo).toBe(false)
    expect(history.canRedo).toBe(false)

    history.push(1)
    expect(history.canUndo).toBe(true)
    expect(history.canRedo).toBe(false)

    history.undo()
    expect(history.canUndo).toBe(false)
    expect(history.canRedo).toBe(true)

    history.redo()
    expect(history.canUndo).toBe(true)
    expect(history.canRedo).toBe(false)
  })

  it('считает размеры стеков', () => {
    const history = createHistory<number>()
    history.push(1)
    history.push(2)
    history.push(3)
    history.undo()

    expect(history.undoSize).toBe(2)
    expect(history.redoSize).toBe(1)
  })
})
