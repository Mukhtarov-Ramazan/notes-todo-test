<script setup lang="ts">
import { ref } from 'vue'
import type { TodoItem } from '~/lib/types'

defineProps<{ todos: TodoItem[] }>()

const emit = defineEmits<{
  toggle: [todoId: string]
  'update:text': [todoId: string, value: string]
  remove: [todoId: string]
  'add-after': [index: number]
  blur: []
}>()

const rootRef = ref<HTMLElement | null>(null)

function focusItem(todoId: string): void {
  const selector = `[data-todo-id="${CSS.escape(todoId)}"] input[type="text"]`
  rootRef.value?.querySelector<HTMLInputElement>(selector)?.focus()
}

defineExpose({ focusItem })
</script>

<template>
  <ul ref="rootRef" class="todo-editor-list" aria-label="Список задач">
    <li v-for="(todo, index) in todos" :key="todo.id">
      <TodoEditorItem
        :todo="todo"
        :index="index"
        @toggle="emit('toggle', todo.id)"
        @update:text="emit('update:text', todo.id, $event)"
        @remove="emit('remove', todo.id)"
        @enter="emit('add-after', index)"
        @blur="emit('blur')"
      />
    </li>
  </ul>
</template>

<style lang="scss" scoped>
.todo-editor-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
</style>
