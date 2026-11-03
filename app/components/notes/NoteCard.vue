<script setup lang="ts">
import type { Note } from '~/lib/types'

defineProps<{ note: Note }>()

const emit = defineEmits<{ delete: [] }>()
</script>

<template>
  <article class="note-card">
    <h2
      class="note-card__title"
      :class="{ 'note-card__title--empty': !note.title.trim() }"
    >
      {{ note.title.trim() || 'Без названия' }}
    </h2>

    <div class="note-card__preview">
      <TodoPreviewList :todos="note.todos" />
    </div>

    <div class="note-card__actions">
      <BaseButton :to="`/notes/${note.id}`">Изменить</BaseButton>
      <BaseButton variant="danger" @click="emit('delete')">Удалить</BaseButton>
    </div>
  </article>
</template>

<style lang="scss" scoped>
.note-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  min-width: 0;
  padding: var(--space-4);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);

  &__title {
    font-size: var(--font-size-lg);
    line-height: 1.3;
    @include break-text;
    @include line-clamp(3);

    &--empty {
      color: var(--color-text-muted);
      font-style: italic;
    }
  }

  &__preview {
    flex: 1;
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }
}
</style>
