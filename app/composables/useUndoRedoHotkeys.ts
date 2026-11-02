import { onBeforeUnmount, onMounted } from 'vue'
import { useModalStack } from '~/composables/useModalStack'
import { useEditorStore } from '~/stores/editor'

const TEXT_INPUT_TYPES = new Set(['text', 'search', 'email', 'url', 'tel', 'password', 'number'])

function isTextField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target instanceof HTMLTextAreaElement) return true
  if (target instanceof HTMLInputElement) return TEXT_INPUT_TYPES.has(target.type)
  return target.isContentEditable
}

/**
 * Глобальные Ctrl/Cmd+Z и Shift+Ctrl/Cmd+Z на странице редактора.
 * Пока в текстовом поле открыта текстовая сессия, откат делает сам браузер.
 */
export function useUndoRedoHotkeys() {
  const editor = useEditorStore()
  const modalStack = useModalStack()

  function onKeydown(event: KeyboardEvent): void {
    if (!(event.ctrlKey || event.metaKey) || event.altKey || event.code !== 'KeyZ') return
    if (modalStack.hasOpenModal.value) return
    if (isTextField(event.target) && editor.hasOpenTextSession) return

    event.preventDefault()
    if (event.shiftKey) editor.redo()
    else editor.undo()
  }

  onMounted(() => document.addEventListener('keydown', onKeydown))
  onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))
}
