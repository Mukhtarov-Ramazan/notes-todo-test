export interface DebouncedRunner {
  schedule(): void
  flush(): void
  cancel(): void
  isPending(): boolean
}

/**
 * Откладывает вызов `fn` на `delayMs`; повторный `schedule` перезапускает таймер.
 * `flush` выполняет отложенный вызов немедленно (если он запланирован), `cancel` отменяет его.
 */
export function createDebouncedRunner(fn: () => void, delayMs: number): DebouncedRunner {
  let timer: ReturnType<typeof setTimeout> | null = null

  function clear() {
    if (timer !== null) {
      clearTimeout(timer)
      timer = null
    }
  }

  return {
    schedule() {
      clear()
      timer = setTimeout(() => {
        timer = null
        fn()
      }, delayMs)
    },
    flush() {
      if (timer === null) return
      clear()
      fn()
    },
    cancel: clear,
    isPending() {
      return timer !== null
    },
  }
}
