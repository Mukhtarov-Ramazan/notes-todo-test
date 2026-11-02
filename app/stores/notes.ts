import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { draftKey, loadNotes, removeDraft, saveNotes } from '~/lib/storage'
import type { Note } from '~/lib/types'

export const useNotesStore = defineStore('notes', () => {
  const notes = ref<Note[]>([])
  const loaded = ref(false)
  const persistError = ref(false)

  const getById = computed(() => (id: string) => notes.value.find((note) => note.id === id))

  const sortedNotes = computed(() => [...notes.value].sort((a, b) => b.updatedAt - a.updatedAt))

  function persist(): void {
    persistError.value = !saveNotes(notes.value)
  }

  function init(): void {
    if (loaded.value) return
    notes.value = loadNotes()
    loaded.value = true
  }

  function upsert(note: Note): void {
    const index = notes.value.findIndex((item) => item.id === note.id)
    if (index === -1) {
      notes.value.push(note)
    } else {
      notes.value.splice(index, 1, note)
    }
    persist()
  }

  function remove(id: string): void {
    notes.value = notes.value.filter((note) => note.id !== id)
    persist()
    removeDraft(draftKey(id))
  }

  function reloadFromStorage(): void {
    notes.value = loadNotes()
    loaded.value = true
  }

  return { notes, loaded, persistError, getById, sortedNotes, init, upsert, remove, reloadFromStorage }
})
