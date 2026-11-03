<script setup lang="ts">
import { ref, useId } from 'vue'

defineOptions({ inheritAttrs: false })

defineProps<{
  label: string
  error?: string
  hideLabel?: boolean
}>()

const emit = defineEmits<{
  blur: [event: FocusEvent]
}>()

const model = defineModel<string>({ default: '' })

const uid = useId()
const inputId = `${uid}-input`
const errorId = `${uid}-error`
const inputRef = ref<HTMLInputElement | null>(null)

function focus(): void {
  inputRef.value?.focus()
}

defineExpose({ focus })
</script>

<template>
  <div class="base-text-field">
    <label
      :for="inputId"
      class="base-text-field__label"
      :class="{ 'base-text-field__label--hidden': hideLabel }"
    >
      {{ label }}
    </label>

    <input
      :id="inputId"
      ref="inputRef"
      v-model="model"
      v-bind="$attrs"
      type="text"
      class="base-text-field__input"
      :class="{ 'base-text-field__input--invalid': error }"
      :aria-invalid="error ? 'true' : undefined"
      :aria-describedby="error ? errorId : undefined"
      @blur="emit('blur', $event)"
    >

    <p
      v-if="error"
      :id="errorId"
      class="base-text-field__error"
    >
      {{ error }}
    </p>
  </div>
</template>

<style lang="scss" scoped>
.base-text-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  min-width: 0;

  &__label {
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--color-text-muted);

    &--hidden {
      @include visually-hidden;
    }
  }

  &__input {
    width: 100%;
    min-height: var(--control-height);
    padding: 0 var(--space-3);
    background: var(--color-surface);
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-md);

    &--invalid {
      border-color: var(--color-error);
    }
  }

  &__error {
    font-size: var(--font-size-sm);
    color: var(--color-error);
  }
}
</style>
