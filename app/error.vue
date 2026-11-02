<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{
  error: NuxtError
}>()

const isNotFound = computed(() => props.error.statusCode === 404)

function goHome(): void {
  void clearError({ redirect: '/' })
}
</script>

<template>
  <NuxtLayout>
    <EmptyState
      :title="isNotFound ? 'Страница не найдена' : 'Что-то пошло не так'"
      :description="
        isNotFound
          ? 'Такого адреса в приложении нет.'
          : 'Произошла непредвиденная ошибка. Попробуйте вернуться на главную.'
      "
    >
      <BaseButton variant="primary" @click="goHome">На главную</BaseButton>
    </EmptyState>
  </NuxtLayout>
</template>
