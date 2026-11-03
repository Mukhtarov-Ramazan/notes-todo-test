<script setup lang="ts">
import { TODO_MAX } from '~/lib/constants'
import type { TodoItem } from '~/lib/types'

defineProps<{
  todo: TodoItem
  index: number
}>()

const emit = defineEmits<{
  toggle: []
  'update:text': [value: string]
  remove: []
  enter: []
  blur: []
}>()

function onEnter(event: KeyboardEvent): void {
  if (event.isComposing) return
  emit('enter')
}
</script>

<template>
  <div class="todo-editor-item" :data-todo-id="todo.id">
    <BaseCheckbox
      :model-value="todo.done"
      :aria-label="`Пункт ${index + 1}: выполнен`"
      @update:model-value="emit('toggle')"
    />

    <BaseTextField
      class="todo-editor-item__text"
      :model-value="todo.text"
      :label="`Текст пункта ${index + 1}`"
      hide-label
      :maxlength="TODO_MAX"
      placeholder="Что нужно сделать"
      @update:model-value="emit('update:text', $event)"
      @keydown.enter.prevent="onEnter"
      @blur="emit('blur')"
    />

    <BaseIconButton
      v-bind="{ ariaLabel: `Удалить пункт ${index + 1}` }"
      @click="emit('remove')"
    >
      <span aria-hidden="true">✕</span>
    </BaseIconButton>
  </div>
</template>

<style lang="scss" scoped>
.todo-editor-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);

  &__text {
    flex: 1;
  }
}
</style>
