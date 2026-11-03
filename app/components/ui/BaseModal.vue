<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, useId } from 'vue'
import { getFocusable, useFocusTrap } from '~/composables/useFocusTrap'
import { useModalStack } from '~/composables/useModalStack'

const props = withDefaults(
  defineProps<{
    title: string
    description?: string
    role?: 'dialog' | 'alertdialog'
    closeOnBackdrop?: boolean
  }>(),
  {
    description: undefined,
    role: 'dialog',
    closeOnBackdrop: false,
  },
)

const emit = defineEmits<{ close: [] }>()

const titleId = useId()
const descriptionId = useId()
const dialogRef = ref<HTMLElement | null>(null)

const modalStack = useModalStack()
const modalId = modalStack.register()
let previouslyFocused: HTMLElement | null = null

useFocusTrap(dialogRef, () => modalStack.isTop(modalId))

function onEscape(event: KeyboardEvent) {
  if (event.key !== 'Escape' || !modalStack.isTop(modalId)) return
  event.preventDefault()
  event.stopPropagation()
  emit('close')
}

function onBackdropMousedown() {
  if (props.closeOnBackdrop) emit('close')
}

onMounted(() => {
  const active = document.activeElement
  previouslyFocused = active instanceof HTMLElement ? active : null

  const root = dialogRef.value
  if (root) {
    const target = root.querySelector<HTMLElement>('[data-autofocus]') ?? getFocusable(root)[0] ?? root
    target.focus()
  }

  document.addEventListener('keydown', onEscape, true)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onEscape, true)
  modalStack.unregister(modalId)
  if (previouslyFocused && previouslyFocused.isConnected) previouslyFocused.focus()
})
</script>

<template>
  <Teleport to="body">
    <div class="base-modal" @mousedown.self="onBackdropMousedown">
      <div
        ref="dialogRef"
        class="base-modal__dialog"
        :role="role"
        aria-modal="true"
        :aria-labelledby="titleId"
        :aria-describedby="description ? descriptionId : undefined"
        tabindex="-1"
      >
        <h2 :id="titleId" class="base-modal__title">
          {{ title }}
        </h2>

        <p
          v-if="description"
          :id="descriptionId"
          class="base-modal__description"
        >
          {{ description }}
        </p>

        <div v-if="$slots.default" class="base-modal__body">
          <slot />
        </div>

        <div v-if="$slots.footer" class="base-modal__footer">
          <slot name="footer" />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style lang="scss" scoped>
.base-modal {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
  background: var(--color-overlay);
  animation: base-modal-fade 0.15s ease-out;

  @include reduced-motion {
    animation: none;
  }

  &__dialog {
    width: 100%;
    max-width: 28rem;
    max-height: 100%;
    overflow-y: auto;
    padding: var(--space-5);
    background: var(--color-surface);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
    animation: base-modal-pop 0.18s ease-out;

    @include reduced-motion {
      animation: none;
    }

    &:focus {
      outline: none;
    }
  }

  &__title {
    margin: 0 0 var(--space-3);
    font-size: var(--font-size-lg);
    @include break-text;
  }

  &__description {
    margin: 0 0 var(--space-4);
    color: var(--color-text-muted);
    @include break-text;
  }

  &__body {
    margin-bottom: var(--space-4);
  }

  &__footer {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: var(--space-2);
  }
}

@keyframes base-modal-fade {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes base-modal-pop {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
</style>
