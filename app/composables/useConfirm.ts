import { nextTick, shallowRef } from 'vue'

export interface ConfirmOptions {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  tone?: 'default' | 'danger'
  initialFocus?: 'confirm' | 'cancel'
}

export type ResolvedConfirmOptions = Required<ConfirmOptions>

interface ConfirmRequest {
  id: number
  options: ResolvedConfirmOptions
  resolve: (result: boolean) => void
}

const current = shallowRef<ConfirmRequest | null>(null)
const queue: ConfirmRequest[] = []
let counter = 0

/** Показывает окно подтверждения; параллельные запросы выстраиваются в очередь. */
export function requestConfirm(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    const tone = options.tone ?? 'default'
    const request: ConfirmRequest = {
      id: ++counter,
      options: {
        title: options.title,
        message: options.message,
        confirmText: options.confirmText ?? 'Подтвердить',
        cancelText: options.cancelText ?? 'Отмена',
        tone,
        initialFocus: options.initialFocus ?? (tone === 'danger' ? 'cancel' : 'confirm'),
      },
      resolve,
    }

    if (current.value) queue.push(request)
    else current.value = request
  })
}

export function useConfirmHost() {
  async function settle(result: boolean) {
    const active = current.value
    if (!active) return

    current.value = null
    active.resolve(result)

    const next = queue.shift()
    if (!next) return

    await nextTick()
    if (current.value) queue.unshift(next)
    else current.value = next
  }

  return { current, settle }
}
