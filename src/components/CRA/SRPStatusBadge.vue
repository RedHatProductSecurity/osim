<script setup lang="ts">
import type { SRPMilestoneStatus, SRPReportStatus } from '@/types/cra';

defineProps<{
  overdueMilestones?: null | number | undefined;
  status: null | SRPMilestoneStatus | SRPReportStatus | string | undefined;
}>();

// Updated for OSIDB-5442: New report and milestone statuses
const STATUS_BADGE_MAP: Record<string, string> = {
  // Report statuses
  empty: 'bg-light text-dark',
  in_progress: 'bg-warning text-dark',
  submitted: 'bg-success text-white',

  // Milestone statuses
  required: 'bg-danger text-white',
  in_review: 'bg-info text-dark',
  obsolete: 'bg-secondary text-white',
};

function getBadgeClass(
  status: null | SRPMilestoneStatus | SRPReportStatus | string | undefined,
): string {
  if (!status) return '';
  // Fallback for unknown statuses
  return STATUS_BADGE_MAP[status] ?? 'bg-secondary text-white';
}

function formatStatus(
  status: null | SRPMilestoneStatus | SRPReportStatus | string | undefined,
): string {
  return status?.replace(/_/g, ' ') ?? '';
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
