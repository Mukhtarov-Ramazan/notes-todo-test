<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{
  error: NuxtError
}>()

const isNotFound = computed(() => props.error.statusCode === 404)

const title = computed(() => (isNotFound.value ? 'Страница не найдена' : 'Что-то пошло не так'))

const description = computed(() =>
  isNotFound.value
    ? 'Такого адреса в приложении нет.'
    : 'Произошла непредвиденная ошибка. Попробуйте вернуться на главную.',
)

function goHome(): void {
  void clearError({ redirect: '/' })
}
</script>

<template>
  <NuxtLayout>
    <EmptyState
      :title="title"
      :description="description"
    >
      <BaseButton variant="primary" @click="goHome">На главную</BaseButton>
    </EmptyState>
  </NuxtLayout>
</template>
