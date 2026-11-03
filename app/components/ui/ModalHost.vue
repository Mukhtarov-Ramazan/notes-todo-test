<script setup lang="ts">
import { useConfirmHost } from '~/composables/useConfirm'

const { current, settle } = useConfirmHost()
</script>

<template>
  <ConfirmModal
    v-if="current"
    :key="current.id"
    :options="current.options"
    @resolve="settle"
  />
</template>
