<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { requestConfirm } from '~/composables/useConfirm'
import { useNotesStore } from '~/stores/notes'
import type { Note } from '~/lib/types'

const notes = useNotesStore()
const headingRef = ref<HTMLElement | null>(null)

async function onDelete(note: Note) {
  const title = note.title.trim() || 'Без названия'
  const confirmed = await requestConfirm({
    title: 'Удалить заметку?',
    message: `Заметка «${title}» будет удалена без возможности восстановления.`,
    confirmText: 'Удалить',
    cancelText: 'Отмена',
    tone: 'danger',
  })
  if (!confirmed) return

  notes.remove(note.id)
  await nextTick()
  headingRef.value?.focus()
}
</script>

<template>
  <div class="home">
    <div class="home__head">
      <h1 ref="headingRef" class="home__title" tabindex="-1">Заметки</h1>
      <BaseButton variant="primary" to="/notes/new">Создать заметку</BaseButton>
    </div>

    <EmptyState
      v-if="notes.sortedNotes.length === 0"
      title="Заметок пока нет"
      description="Создайте первую заметку со списком задач."
    >
      <BaseButton variant="primary" to="/notes/new">Создать заметку</BaseButton>
    </EmptyState>

    <ul v-else class="home__grid">
      <li v-for="note in notes.sortedNotes" :key="note.id" class="home__cell">
        <NoteCard :note="note" @delete="onDelete(note)" />
      </li>
    </ul>
  </div>
</template>

<style lang="scss" scoped>
.home {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);

  &__head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
  }

  &__title {
    font-size: var(--font-size-xl);

    &:focus {
      outline: none;
    }
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: var(--space-4);
  }

  &__cell {
    display: flex;
    min-width: 0;

    > * {
      flex: 1;
    }
  }
}
</style>
