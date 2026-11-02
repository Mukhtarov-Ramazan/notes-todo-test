<script setup lang="ts">
defineProps<{
  label?: string
  ariaLabel?: string
}>()

const model = defineModel<boolean>({ default: false })
</script>

<template>
  <label class="base-checkbox">
    <input v-model="model" type="checkbox" class="base-checkbox__input" :aria-label="ariaLabel">
    <span v-if="label || $slots.default" class="base-checkbox__label">
      <slot>{{ label }}</slot>
    </span>
  </label>
</template>

<style lang="scss" scoped>
.base-checkbox {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  min-height: var(--control-height);
  cursor: pointer;

  &__input {
    flex-shrink: 0;
    width: 1.25rem;
    height: 1.25rem;
    margin: 0;
    accent-color: var(--color-primary);
    cursor: pointer;
  }

  &__label {
    @include break-text;
  }
}
</style>
