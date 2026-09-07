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

  // Status-based icons for regular milestones (OSIDB-5442)
  switch (milestone.status) {
    case 'required':
      return 'bi-circle-fill text-danger';
    case 'in_progress':
      return 'bi-circle-fill text-warning';
    case 'in_review':
      return 'bi-circle-fill text-info';
    case 'submitted':
      return 'bi-circle-fill text-success';
    case 'obsolete':
      return 'bi-circle text-muted';
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
