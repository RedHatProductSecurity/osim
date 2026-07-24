<script setup lang="ts">
import type { SRPReportStatus } from '@/types/cra';

defineProps<{
  overdueMilestones?: null | number | undefined;
  status: null | SRPReportStatus | undefined;
}>();

const STATUS_BADGE_MAP: Record<SRPReportStatus, string> = {
  blocked: 'bg-danger text-white',
  deferred: 'bg-secondary text-white',
  failed: 'bg-danger text-white',
  not_applicable: 'bg-light text-dark',
  not_required: 'bg-light text-dark',
  prepared: 'bg-info text-white',
  required: 'bg-warning text-dark',
  submitted: 'bg-success text-white',
};

function getBadgeClass(status: null | SRPReportStatus | undefined): string {
  return status ? STATUS_BADGE_MAP[status] : '';
}

function formatStatus(status: null | SRPReportStatus | undefined): string {
  return status?.replace('_', ' ') ?? '';
}
</script>

<template>
  <div v-if="status" class="d-flex gap-1 align-items-center">
    <span class="badge" :class="getBadgeClass(status)">
      {{ formatStatus(status) }}
    </span>
    <span v-if="overdueMilestones && overdueMilestones > 0" class="badge bg-danger">
      {{ overdueMilestones }} Overdue
    </span>
  </div>
  <span v-else class="text-muted">—</span>
</template>
