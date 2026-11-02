<script setup lang="ts">
import { requestConfirm } from '~/composables/useConfirm'

const result = ref('—')

async function askOne() {
  const ok = await requestConfirm({ title: 'Продолжить?', message: 'Обычное подтверждение.' })
  result.value = String(ok)
}

async function askQueue() {
  const first = requestConfirm({
    title: 'Удалить заметку?',
    message: 'Первое окно очереди (danger, фокус на «Отмена»).',
    confirmText: 'Удалить',
    tone: 'danger',
  })
  const second = requestConfirm({ title: 'Второе окно', message: 'Появилось после первого.' })
  const [a, b] = await Promise.all([first, second])
  result.value = `${a} / ${b}`
}
</script>

<template>
  <main>
    <h1>Заметки</h1>
    <p>Список заметок появится на следующих этапах.</p>
    <!-- DEMO: временно для проверки этапа 6, удалить -->
    <BaseButton @click="askOne">Одно окно</BaseButton>
    <BaseButton @click="askQueue">Два окна подряд</BaseButton>
    <p>Результат: {{ result }}</p>
  </main>
</template>
