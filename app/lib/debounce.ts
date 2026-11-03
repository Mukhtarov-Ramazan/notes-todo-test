export interface DebouncedRunner {
  schedule(): void
  flush(): void
  cancel(): void
  isPending(): boolean
}

/** Каждый `schedule` перезапускает таймер. `flush` вызывает `fn` сразу, `cancel` отменяет вызов. */
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
