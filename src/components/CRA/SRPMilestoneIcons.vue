<script setup lang="ts">
import { computed } from 'vue';

import type { SRPReport, SRPReportMilestone } from '@/types/cra';
import { sortMilestones } from '@/types/cra';

const props = defineProps<{
  report: SRPReport;
}>();

const sortedMilestones = computed(() => sortMilestones(props.report.milestones || []));

function getMilestoneIcon(milestone: SRPReportMilestone): string {
  // Special icon for additional information request milestones
  if (milestone.milestone_type === 'additional_information_response') {
    return 'bi-info-circle-fill';
  }

  // TODO: OSIDB-5423 - Backend pending: Update cases for new milestone statuses:
  // required (default), in_progress, in_review, submitted, obsolete
  // Status-based icons for regular milestones
  switch (milestone.status) {
    case 'required':
      return 'bi-circle-fill text-danger';
    case 'prepared': // "In progress" in new backend
      return 'bi-circle-fill text-warning';
    case 'submitted':
      return 'bi-circle-fill text-success';
    case 'not_required': // "Obsolete" in new backend
      return 'bi-circle text-muted';
    case 'blocked':
      return 'bi-circle-fill text-danger';
    case 'deferred':
      return 'bi-circle-fill text-secondary';
    case 'not_applicable':
      return 'bi-circle text-muted';
    case 'failed':
      return 'bi-circle-fill text-danger';
    default:
      return 'bi-circle text-muted';
  }
}

function getMilestoneTooltip(milestone: SRPReportMilestone): string {
  const type = milestone.milestone_type
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
  const status = milestone.status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
  return `${type} - ${status}`;
}
</script>

<template>
  <div class="d-flex gap-1 align-items-center">
    <i
      v-for="milestone in sortedMilestones"
      :key="milestone.uuid"
      class="bi"
      :class="getMilestoneIcon(milestone)"
      :title="getMilestoneTooltip(milestone)"
      style="font-size: 0.9rem;"
    ></i>
  </div>
</template>
