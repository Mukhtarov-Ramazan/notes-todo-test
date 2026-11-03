import { onBeforeUnmount, onMounted } from 'vue'
import type { Ref } from 'vue'

const FOCUSABLE_SELECTOR =
  'a[href], button, input, select, textarea, [tabindex], [contenteditable="true"]'

export function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) =>
      !el.matches(':disabled') &&
      el.tabIndex >= 0 &&
      el.getClientRects().length > 0 &&
      getComputedStyle(el).visibility !== 'hidden',
  )
}

/** Не выпускает фокус за пределы контейнера, пока isActive() === true. */
export function useFocusTrap(container: Ref<HTMLElement | null>, isActive: () => boolean) {
  function onKeydown(event: KeyboardEvent) {
    const root = container.value
    if (event.key !== 'Tab' || !root || !isActive()) return

    const items = getFocusable(root)
    const first = items[0]
    const last = items[items.length - 1]
    if (!first || !last) {
      event.preventDefault()
      root.focus()
      return
    }

    const current = document.activeElement
    if (!(current instanceof Node) || !root.contains(current) || current === root) {
      event.preventDefault()
      ;(event.shiftKey ? last : first).focus()
    } else if (event.shiftKey && current === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && current === last) {
      event.preventDefault()
      first.focus()
    }
  }

  function onFocusin(event: FocusEvent) {
    const root = container.value
    if (!root || !isActive()) return
    if (event.target instanceof Node && root.contains(event.target)) return
    const [first] = getFocusable(root)
    ;(first ?? root).focus()
  }

  onMounted(() => {
    document.addEventListener('keydown', onKeydown)
    document.addEventListener('focusin', onFocusin)
  })

  onBeforeUnmount(() => {
    document.removeEventListener('keydown', onKeydown)
    document.removeEventListener('focusin', onFocusin)
  })
}
