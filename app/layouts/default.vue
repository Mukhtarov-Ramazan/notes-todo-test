<script setup lang="ts">
import { useNotesStore } from '~/stores/notes'

const notes = useNotesStore()
</script>

<template>
  <div class="layout">
    <a href="#main" class="layout__skip">Перейти к содержимому</a>
    <header class="layout__header">
      <div class="layout__container layout__bar">
        <NuxtLink to="/" class="layout__brand">Заметки</NuxtLink>
      </div>
      <p v-if="notes.persistError" class="layout__warning" role="status">
        Не удалось сохранить данные в браузере. Возможно, хранилище переполнено или отключено.
      </p>
    </header>
    <main id="main" class="layout__main layout__container" tabindex="-1">
      <slot />
    </main>
  </div>
</template>

<style lang="scss" scoped>
.layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;

  &__header {
    position: sticky;
    top: 0;
    z-index: var(--z-header);
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-border);
    box-shadow: var(--shadow-sm);
  }

  &__container {
    width: 100%;
    max-width: 1100px;
    margin: 0 auto;
    padding-inline: var(--space-4);

    @include respond-up($bp-md) {
      padding-inline: var(--space-5);
    }
  }

  &__bar {
    display: flex;
    align-items: center;
    min-height: 3.5rem;
  }

  &__brand {
    font-size: var(--font-size-lg);
    font-weight: 700;
    color: var(--color-text);
    text-decoration: none;
  }

  &__skip {
    position: absolute;
    top: var(--space-2);
    left: var(--space-2);
    z-index: var(--z-toast);
    padding: var(--space-2) var(--space-3);
    background: var(--color-surface);
    border-radius: var(--radius-sm);
    transform: translateY(-200%);

    &:focus {
      transform: none;
    }
  }

  &__main:focus {
    outline: none;
  }

  &__warning {
    margin: 0;
    padding: var(--space-2) var(--space-4);
    font-size: var(--font-size-sm);
    text-align: center;
    color: var(--color-danger-contrast);
    background: var(--color-danger);
  }

  &__main {
    flex: 1;
    padding-block: var(--space-5);
  }
}
</style>
