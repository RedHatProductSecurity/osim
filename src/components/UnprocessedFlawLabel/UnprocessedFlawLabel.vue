<script setup lang="ts">
import { computed } from 'vue';

import { useUnprocessedFlawDetection } from '@/composables/unprocessedFlawCheck';

import type { ZodFlawType } from '@/types';

const props = defineProps<{
  flaw: ZodFlawType;
  variant?: 'badge' | 'inline';
}>();

const { isFlawUnprocessed } = useUnprocessedFlawDetection();

const showLabel = computed(() => isFlawUnprocessed(props.flaw));
</script>

<template>
  <span
    v-if="showLabel"
    class="unprocessed-flaw-label"
    :class="{
      'badge': variant === 'badge',
      'inline': variant === 'inline'
    }"
    title="This flaw is pending bot processing"
  >
    <i class="bi bi-exclamation-triangle-fill me-1"></i>
    Pending Bot Processing
  </span>
</template>

<style scoped>
.unprocessed-flaw-label {
  display: inline-flex;
  align-items: center;
  font-size: 0.75rem;
  font-weight: 500;
  color: #055160;
  background-color: #cff4fc;
  border: 1px solid #9eeaf9;
  border-radius: 0.25rem;
  padding: 0.25rem 0.5rem;
}

.unprocessed-flaw-label.badge {
  font-size: 0.7rem;
  padding: 0.2rem 0.4rem;
  border-radius: 0.375rem;
}

.unprocessed-flaw-label.inline {
  font-size: 0.75rem;
  padding: 0.15rem 0.4rem;
  margin: 0;
}

.unprocessed-flaw-label i {
  font-size: 0.8em;
}

.unprocessed-flaw-label:hover {
  background-color: #9eeaf9;
  border-color: #6edff6;
}
</style>
