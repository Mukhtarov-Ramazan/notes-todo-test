<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  dirty: boolean
  justSaved: boolean
  canUndo: boolean
  canRedo: boolean
}>()

const emit = defineEmits<{
  undo: []
  redo: []
  cancel: []
  delete: []
}>()

const statusText = computed(() => {
  if (props.dirty) return 'Есть несохранённые изменения'
  if (props.justSaved) return 'Сохранено'
  return 'Все изменения сохранены'
})
</script>

<template>
  <div class="editor-toolbar">
    <p class="editor-toolbar__status" :class="{ 'editor-toolbar__status--dirty': dirty }" aria-live="polite">
      {{ statusText }}
    </p>
    <div class="editor-toolbar__actions">
      <BaseIconButton
        v-bind="{ ariaLabel: 'Отменить изменение (Ctrl+Z)' }"
        title="Отменить изменение (Ctrl+Z)"
        :disabled="!canUndo"
        @click="emit('undo')"
      >
        <span aria-hidden="true">↶</span>
      </BaseIconButton>
      <BaseIconButton
        v-bind="{ ariaLabel: 'Повторить изменение (Shift+Ctrl+Z)' }"
        title="Повторить изменение (Shift+Ctrl+Z)"
        :disabled="!canRedo"
        @click="emit('redo')"
      >
        <span aria-hidden="true">↷</span>
      </BaseIconButton>
      <BaseButton type="submit" variant="primary" :disabled="!dirty">Сохранить</BaseButton>
      <BaseButton variant="secondary" @click="emit('cancel')">Отменить редактирование</BaseButton>
      <BaseButton variant="danger" @click="emit('delete')">Удалить</BaseButton>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.editor-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);

  &__status {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);

    &--dirty {
      color: var(--color-text);
      font-weight: 600;
    }
  }

  &__status {
    flex: 1 1 100%;

    @include respond-up($bp-md) {
      flex: 0 1 auto;
    }
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }
}
</style>
