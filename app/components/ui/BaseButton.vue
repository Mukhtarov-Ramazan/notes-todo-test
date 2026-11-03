<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'

withDefaults(
  defineProps<{
    variant?: Variant
    to?: RouteLocationRaw
    type?: 'button' | 'submit' | 'reset'
    disabled?: boolean
  }>(),
  {
    variant: 'secondary',
    to: undefined,
    type: 'button',
    disabled: false,
  },
)
</script>

<template>
  <NuxtLink
    v-if="to"
    :to="to"
    class="base-button"
    :class="`base-button--${variant}`"
  >
    <slot />
  </NuxtLink>

  <button
    v-else
    :type="type"
    :disabled="disabled"
    class="base-button"
    :class="`base-button--${variant}`"
  >
    <slot />
  </button>
</template>

<style lang="scss" scoped>
.base-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-height: var(--control-height);
  padding: 0 var(--space-4);
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  font-weight: 600;
  line-height: 1.2;
  text-align: center;
  text-decoration: none;
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease;

  @include reduced-motion {
    transition: none;
  }

  &:disabled {
    opacity: 0.55;
  }

  &--primary {
    color: var(--color-primary-contrast);
    background: var(--color-primary);

    &:hover:not(:disabled) {
      background: var(--color-primary-hover);
    }
  }

  &--secondary {
    color: var(--color-text);
    background: var(--color-surface);
    border-color: var(--color-border-strong);

    &:hover:not(:disabled) {
      background: var(--color-hover);
    }
  }

  &--danger {
    color: var(--color-danger-contrast);
    background: var(--color-danger);

    &:hover:not(:disabled) {
      background: var(--color-danger-hover);
    }
  }

  &--ghost {
    color: var(--color-primary);
    background: transparent;

    &:hover:not(:disabled) {
      background: var(--color-hover);
    }
  }
}
</style>
