import { NOTES_KEY } from '~/lib/constants'
import { useNotesStore } from '~/stores/notes'

export default defineNuxtPlugin(() => {
  const notes = useNotesStore()
  notes.init()

  window.addEventListener('storage', (event) => {
    if (event.key === NOTES_KEY || event.key === null) {
      notes.reloadFromStorage()
    }
  })
})
