import { computed, ref } from 'vue'

const stack = ref<number[]>([])
let counter = 0

function setPageLocked(locked: boolean) {
  const root = document.getElementById('__nuxt')
  if (locked) {
    root?.setAttribute('inert', '')
    root?.setAttribute('aria-hidden', 'true')
    document.body.style.overflow = 'hidden'
  } else {
    root?.removeAttribute('inert')
    root?.removeAttribute('aria-hidden')
    document.body.style.overflow = ''
  }
}

/** Общий счётчик открытых модальных окон: фон блокируется, пока открыто хотя бы одно. */
export function useModalStack() {
  const hasOpenModal = computed(() => stack.value.length > 0)

  function register(): number {
    const id = ++counter
    stack.value = [...stack.value, id]
    if (stack.value.length === 1) setPageLocked(true)
    return id
  }

  function unregister(id: number) {
    stack.value = stack.value.filter((item) => item !== id)
    if (stack.value.length === 0) setPageLocked(false)
  }

  function isTop(id: number): boolean {
    return stack.value[stack.value.length - 1] === id
  }

  return { hasOpenModal, register, unregister, isTop }
}
