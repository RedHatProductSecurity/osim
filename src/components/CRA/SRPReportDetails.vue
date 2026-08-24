<script setup lang="ts">
import SRPMilestoneExpandable from '@/components/CRA/SRPMilestoneExpandable.vue';

import type { SRPReport, SRPReportMilestone } from '@/types/cra';

defineProps<{
  report: SRPReport;
}>();

const emit = defineEmits<{
  'add-milestone': [reportUuid: string];
  'edit-milestone': [milestone: SRPReportMilestone];
  'refresh': [];
}>();
</script>

<template>
  <div class="p-3 bg-light">
    <div class="d-flex justify-content-between align-items-center mb-2">
      <h6 class="mb-0">Milestones</h6>
      <button
        type="button"
        class="btn btn-sm btn-secondary"
        @click="emit('add-milestone', report.uuid)"
      >
        <i class="bi bi-plus-circle me-1"></i>
        Add Milestone
      </button>
    </div>
    <div v-if="!report.milestones || report.milestones.length === 0" class="text-muted">
      No milestones defined.
    </div>
    <div v-else>
      <div
        v-if="
          report.milestones.some(
            m => m.milestone_type === '72h' || m.milestone_type === 'final',
          )
        "
        class="alert alert-info alert-sm mb-2"
      >
        <i class="bi bi-info-circle me-1"></i>
        <small>
          72h and Final milestones copy data from previous stages.
          Edit to update before submission.
        </small>
      </div>
      <table class="table table-striped table-hover table-sm mb-0">
        <thead class="table-dark">
          <tr>
            <th style="width: 40px"></th>
            <th>Type</th>
            <th>Status</th>
            <th>Due Date</th>
            <th>Time Remaining</th>
            <th style="width: 200px">Actions</th>
          </tr>
        </thead>
        <tbody>
          <SRPMilestoneExpandable
            v-for="milestone in report.milestones"
            :key="milestone.uuid"
            :milestone="milestone"
            @edit-milestone="emit('edit-milestone', $event)"
            @refresh="emit('refresh')"
          />
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.btn:hover {
  opacity: 0.85;
}
</style>
