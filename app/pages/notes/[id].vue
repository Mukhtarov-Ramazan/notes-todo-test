<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { TITLE_MAX } from '~/lib/constants'
import { requestConfirm } from '~/composables/useConfirm'
import { useUndoRedoHotkeys } from '~/composables/useUndoRedoHotkeys'
import { validateForSave } from '~/lib/note-ops'
import { useEditorStore } from '~/stores/editor'
import { useNotesStore } from '~/stores/notes'

const route = useRoute()
const router = useRouter()
const editor = useEditorStore()
const notes = useNotesStore()

let allowLeave = false

useUndoRedoHotkeys()

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

async function offerDraftRestore(): Promise<void> {
  const draft = editor.pendingDraft
  if (!draft) return

  const outdated = draft.baseUpdatedAt !== editor.baseUpdatedAt
  const restore = await requestConfirm({
    title: 'Восстановить несохранённые изменения?',
    message: outdated
      ? 'Найден черновик, но заметка была изменена после его создания. При восстановлении версия из списка будет заменена черновиком.'
      : 'Найден черновик с несохранёнными изменениями этой заметки.',
    confirmText: 'Восстановить',
    cancelText: 'Отбросить',
    initialFocus: 'confirm',
  })
  if (editor.pendingDraft !== draft) return

  if (restore) editor.restoreDraft()
  else editor.discardDraft()
}

watch(
  idParam,
  async (id) => {
    editor.open(id)
    submitted.value = false
    justSaved.value = false
    if (editor.status !== 'ready') return

    await offerDraftRestore()
    if (editor.isNew && !editor.dirty) {
      await nextTick()
      titleRef.value?.focus()
    }
  },
  { immediate: true },
)

async function onDeletedElsewhere(): Promise<void> {
  const saveAgain = await requestConfirm({
    title: 'Заметка удалена в другой вкладке',
    message: 'Вы можете сохранить текущую версию как новую заметку или закрыть редактор.',
    confirmText: 'Сохранить как новую',
    cancelText: 'Закрыть',
    initialFocus: 'confirm',
  })

  if (saveAgain) {
    submitted.value = true
    const result = editor.saveAsNew()
    if (!result.ok) titleRef.value?.focus()
    else justSaved.value = true
    return
  }

  allowLeave = true
  editor.cancel()
  await leaveToList()
}

watch(
  () => editor.status,
  (status) => {
    if (status === 'deleted-elsewhere' && !allowLeave) void onDeletedElsewhere()
  },
)

function flushDraftOnHide(): void {
  if (document.visibilityState === 'hidden') editor.flushDraft()
}

onMounted(() => {
  window.addEventListener('pagehide', editor.flushDraft)
  document.addEventListener('visibilitychange', flushDraftOnHide)
})

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

async function leaveToList(): Promise<void> {
  allowLeave = true
  await router.push('/')
  allowLeave = false
}

async function onCancel(): Promise<void> {
  const hasChanges = editor.dirty
  const confirmed = await requestConfirm({
    title: hasChanges ? 'Отменить редактирование?' : 'Закрыть редактирование?',
    message: hasChanges
      ? 'Все несохранённые изменения будут потеряны.'
      : 'Изменений нет, вы вернётесь к списку заметок.',
    confirmText: hasChanges ? 'Отменить редактирование' : 'Закрыть',
    cancelText: 'Продолжить редактирование',
    tone: hasChanges ? 'danger' : 'default',
  })
  if (!confirmed) return

  editor.cancel()
  await leaveToList()
}

async function onDelete(): Promise<void> {
  const title = editor.current.title.trim() || 'Без названия'
  const confirmed = await requestConfirm({
    title: 'Удалить заметку?',
    message: editor.isNew
      ? 'Несохранённая заметка и её черновик будут удалены.'
      : `Заметка «${title}» будет удалена без возможности восстановления.`,
    confirmText: 'Удалить',
    cancelText: 'Отмена',
    tone: 'danger',
  })
  if (!confirmed) return

  const id = editor.noteId
  const wasNew = editor.isNew
  allowLeave = true
  editor.cancel()
  if (!wasNew) notes.remove(id)
  await leaveToList()
}

async function confirmLeave(): Promise<boolean> {
  if (allowLeave || !editor.dirty) return true
  const confirmed = await requestConfirm({
    title: 'Выйти без сохранения?',
    message: 'Несохранённые изменения будут потеряны.',
    confirmText: 'Выйти',
    cancelText: 'Остаться',
    tone: 'danger',
  })
  if (confirmed) editor.cancel()
  return confirmed
}

onBeforeRouteLeave(confirmLeave)

onBeforeRouteUpdate((to, from) => {
  if (to.params.id === from.params.id) return true
  return confirmLeave()
})

onBeforeUnmount(() => {
  window.removeEventListener('pagehide', editor.flushDraft)
  document.removeEventListener('visibilitychange', flushDraftOnHide)
  editor.commitText()
  editor.flushDraft()
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

  <form
    v-else-if="editor.status === 'ready' || editor.status === 'deleted-elsewhere'"
    class="editor"
    novalidate
    @submit.prevent="onSave"
  >
    <div>
      <BaseButton variant="ghost" to="/">← К списку</BaseButton>
    </div>

    <h1 class="editor__title">
      {{ editor.isNew ? 'Новая заметка' : 'Редактирование заметки' }}
    </h1>

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

      <p v-if="editor.current.todos.length === 0" class="editor__empty">
        Пунктов пока нет.
      </p>

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

    <EditorToolbar
      :dirty="editor.dirty"
      :just-saved="justSaved"
      :can-undo="editor.canUndo"
      :can-redo="editor.canRedo"
      @undo="editor.undo"
      @redo="editor.redo"
      @cancel="onCancel"
      @delete="onDelete"
    />
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
