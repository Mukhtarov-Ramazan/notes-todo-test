<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { TITLE_MAX } from '~/lib/constants'
import { validateForSave } from '~/lib/note-ops'
import { useEditorStore } from '~/stores/editor'

const route = useRoute()
const router = useRouter()
const editor = useEditorStore()

const titleRef = ref<{ focus: () => void } | null>(null)
const listRef = ref<{ focusItem: (todoId: string) => void } | null>(null)
const submitted = ref(false)
const justSaved = ref(false)

const idParam = computed(() => {
  const raw = route.params.id
  return (Array.isArray(raw) ? raw[0] : raw) ?? ''
})

const validation = computed(() => validateForSave(editor.current))
const titleError = computed(() => {
  const result = validation.value
  return submitted.value && !result.ok ? result.titleError : ''
})

watch(
  idParam,
  async (id) => {
    editor.open(id)
    submitted.value = false
    justSaved.value = false
    if (editor.status === 'ready' && editor.isNew) {
      await nextTick()
      titleRef.value?.focus()
    }
  },
  { immediate: true },
)

watch(
  () => editor.dirty,
  (dirty) => {
    if (dirty) justSaved.value = false
  },
)

async function onSave(): Promise<void> {
  submitted.value = true
  const wasNew = editor.isNew
  const result = editor.save()
  if (!result.ok) {
    titleRef.value?.focus()
    return
  }
  if (wasNew) await router.replace(`/notes/${editor.noteId}`)
  justSaved.value = true
}

async function addTodoAfter(index?: number): Promise<void> {
  const id = editor.addTodo(index)
  await nextTick()
  listRef.value?.focusItem(id)
}

onBeforeUnmount(() => {
  editor.commitText()
})
</script>

<template>
  <EmptyState
    v-if="editor.status === 'not-found'"
    title="Заметка не найдена"
    description="Возможно, она была удалена или ссылка неверна."
  >
    <BaseButton variant="primary" to="/">К списку заметок</BaseButton>
  </EmptyState>

  <form v-else-if="editor.status === 'ready'" class="editor" novalidate @submit.prevent="onSave">
    <h1 class="editor__title">{{ editor.isNew ? 'Новая заметка' : 'Редактирование заметки' }}</h1>

    <BaseTextField
      ref="titleRef"
      :model-value="editor.current.title"
      label="Название"
      :error="titleError"
      :maxlength="TITLE_MAX"
      placeholder="Название заметки"
      @update:model-value="editor.setTitle"
      @blur="editor.commitText"
    />

    <section class="editor__todos" aria-labelledby="editor-todos-heading">
      <h2 id="editor-todos-heading" class="editor__subtitle">Задачи</h2>
      <p v-if="editor.current.todos.length === 0" class="editor__empty">Пунктов пока нет.</p>
      <TodoEditorList
        ref="listRef"
        :todos="editor.current.todos"
        @toggle="editor.toggleTodo"
        @update:text="editor.setTodoText"
        @remove="editor.removeTodo"
        @add-after="addTodoAfter"
        @blur="editor.commitText"
      />
      <div>
        <BaseButton variant="secondary" @click="addTodoAfter()">Добавить пункт</BaseButton>
      </div>
    </section>

    <EditorToolbar :dirty="editor.dirty" :just-saved="justSaved" />
  </form>
</template>

<style lang="scss" scoped>
.editor {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  max-width: 44rem;

  &__title {
    font-size: var(--font-size-xl);
  }

  &__todos {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  &__subtitle {
    font-size: var(--font-size-lg);
  }

  &__empty {
    color: var(--color-text-muted);
  }
}
</style>
