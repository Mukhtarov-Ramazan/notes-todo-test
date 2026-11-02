<template>
  <div class="layout">
    <header class="layout__header">
      <div class="layout__container layout__bar">
        <NuxtLink to="/" class="layout__brand">Заметки</NuxtLink>
      </div>
    </header>
    <main class="layout__main layout__container">
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

  &__main {
    flex: 1;
    padding-block: var(--space-5);
  }
}
</style>
