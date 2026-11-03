<script setup lang="ts">
withDefaults(
  defineProps<{
    ariaLabel: string
    type?: 'button' | 'submit' | 'reset'
    disabled?: boolean
  }>(),
  {
    type: 'button',
    disabled: false,
  },
)
</script>

<template>
  <button
    :type="type"
    :disabled="disabled"
    :aria-label="ariaLabel"
    class="base-icon-button"
  >
    <slot />
  </button>
</template>

<style lang="scss" scoped>
.base-icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: var(--control-height);
  height: var(--control-height);
  padding: 0;
  color: var(--color-text);
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  transition: background-color 0.15s ease;

  @include reduced-motion {
    transition: none;
  }

  &:hover:not(:disabled) {
    background: var(--color-hover);
  }

  &:disabled {
    opacity: 0.45;
  }
}
</style>
