<script setup lang="ts">
import { computed } from 'vue'
import { PREVIEW_TODOS_COUNT } from '~/lib/constants'
import type { TodoItem } from '~/lib/types'

const props = withDefaults(
  defineProps<{
    todos: TodoItem[]
    max?: number
  }>(),
  { max: PREVIEW_TODOS_COUNT },
)

const visible = computed(() => props.todos.slice(0, props.max))
const hiddenCount = computed(() => Math.max(0, props.todos.length - props.max))
</script>

<template>
  <p v-if="todos.length === 0" class="todo-preview__empty">
    Нет пунктов
  </p>

  <div v-else class="todo-preview">
    <ul class="todo-preview__list">
      <li
        v-for="todo in visible"
        :key="todo.id"
        class="todo-preview__item"
      >
        <span
          class="todo-preview__mark"
          :class="{ 'todo-preview__mark--done': todo.done }"
          aria-hidden="true"
        />

        <span class="todo-preview__status">
          {{ todo.done ? 'выполнено' : 'не выполнено' }}:
        </span>

        <span
          class="todo-preview__text"
          :class="{ 'todo-preview__text--done': todo.done }"
        >
          {{ todo.text || 'Пустой пункт' }}
        </span>
      </li>
    </ul>

    <p v-if="hiddenCount > 0" class="todo-preview__more">
      ещё {{ hiddenCount }}
    </p>
  </div>
</template>

<style lang="scss" scoped>
.todo-preview {
  &__empty,
  &__more {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
  }

  &__more {
    margin-top: var(--space-2);
  }

  &__list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  &__item {
    display: flex;
    align-items: flex-start;
    gap: var(--space-2);
  }

  &__mark {
    position: relative;
    flex-shrink: 0;
    width: 1rem;
    height: 1rem;
    margin-top: 0.2rem;
    border: 2px solid var(--color-border-strong);
    border-radius: var(--radius-sm);

    &--done {
      background: var(--color-primary);
      border-color: var(--color-primary);

      &::after {
        content: '';
        position: absolute;
        top: 0;
        left: 3px;
        width: 4px;
        height: 8px;
        border: solid var(--color-primary-contrast);
        border-width: 0 2px 2px 0;
        transform: rotate(45deg);
      }
    }
  }

  &__status {
    @include visually-hidden;
  }

  &__text {
    min-width: 0;
    @include break-text;
    @include line-clamp(2);

    &--done {
      color: var(--color-text-muted);
      text-decoration: line-through;
    }
  }
}
</style>
