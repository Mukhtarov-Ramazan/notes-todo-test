<script setup lang="ts">
import type { ResolvedConfirmOptions } from '~/composables/useConfirm'

defineProps<{ options: ResolvedConfirmOptions }>()

const emit = defineEmits<{ resolve: [result: boolean] }>()
</script>

<template>
  <BaseModal
    role="alertdialog"
    :title="options.title"
    :description="options.message"
    @close="emit('resolve', false)"
  >
    <template #footer>
      <BaseButton
        variant="secondary"
        :data-autofocus="options.initialFocus === 'cancel' ? '' : undefined"
        @click="emit('resolve', false)"
      >
        {{ options.cancelText }}
      </BaseButton>

      <BaseButton
        :variant="options.tone === 'danger' ? 'danger' : 'primary'"
        :data-autofocus="options.initialFocus === 'confirm' ? '' : undefined"
        @click="emit('resolve', true)"
      >
        {{ options.confirmText }}
      </BaseButton>
    </template>
  </BaseModal>
</template>
