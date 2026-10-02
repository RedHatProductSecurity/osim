<script lang="ts" setup>
import { computed } from 'vue';

import type { ZodTrackerType } from '@/types';
import { trackerUrl } from '@/services/TrackerService';

const props = defineProps<{
  failureReason?: null | string;
  statusError?: boolean;
  statusLoading?: boolean;
  statusValue?: string;
  tracker: null | undefined | ZodTrackerType;
}>();

const url = computed(() => props.tracker ? trackerUrl(props.tracker.type, props.tracker.external_system_id) : '');
const tooltip = computed(() => props.statusError
  ? 'Unable to retrieve tracker creation status.'
  : props.failureReason?.trim() || undefined);
</script>
<template>
  <a
    v-if="tracker?.external_system_id"
    :href="url"
    target="_blank"
  >
    {{ tracker.external_system_id }}
    <i class="bi-box-arrow-up-right"></i>
  </a>
  <span
    v-else-if="statusLoading"
    class="placeholder-glow"
    role="status"
    aria-label="Loading tracker status"
  >
    <span class="placeholder col-7 rounded-pill">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
  </span>
  <span
    v-else-if="statusValue === 'Failed'"
    class="badge border border-danger-subtle bg-danger-subtle text-danger-emphasis"
    tabindex="0"
    :title="tooltip"
  ><i class="bi-x-circle me-1"></i>Failed</span>
  <span
    v-else-if="statusValue === 'In Progress'"
    class="badge border border-warning-subtle bg-warning-subtle text-warning-emphasis"
  >
    <span class="spinner-border spinner-border-sm me-1" aria-hidden="true"></span>In Progress
  </span>
  <span v-else-if="statusValue === 'none'" class="text-secondary">none</span>
</template>
