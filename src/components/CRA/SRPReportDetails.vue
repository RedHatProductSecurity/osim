<script setup lang="ts">
import { computed, ref } from 'vue';

import SRPMilestoneExpandable from '@/components/CRA/SRPMilestoneExpandable.vue';

import type { AdditionalInformationRequest, SRPReport, SRPReportMilestone } from '@/types/cra';
import { sortMilestones } from '@/types/cra';

const props = defineProps<{
  report: SRPReport;
}>();

const emit = defineEmits<{
  'add-milestone': [milestoneUuid: string];
  'edit-air': [air: AdditionalInformationRequest, milestoneUuid: string];
  'edit-milestone': [milestone: SRPReportMilestone];
  'refresh': [];
  'view-payload': [milestone: SRPReportMilestone];
}>();

const sortedMilestones = computed(() => sortMilestones(props.report.milestones || []));
const showMilestoneDropdown = ref(false);

function handleAddAIR(milestoneUuid: string) {
  emit('add-milestone', milestoneUuid);
  showMilestoneDropdown.value = false;
}

function handleEditAIR(air: AdditionalInformationRequest, milestone: SRPReportMilestone) {
  emit('edit-air', air, milestone.uuid);
}
</script>

<template>
  <div class="p-3 bg-light">
    <div class="d-flex justify-content-between align-items-center mb-2">
      <h6 class="mb-0">SRP Reports</h6>
      <div class="dropdown">
        <button
          type="button"
          class="btn btn-sm btn-secondary dropdown-toggle"
          :disabled="!report.milestones || report.milestones.length === 0"
          @click="showMilestoneDropdown = !showMilestoneDropdown"
        >
          <i class="bi bi-plus-circle me-1"></i>
          Add Additional Information Response
        </button>
        <ul
          v-if="showMilestoneDropdown"
          class="dropdown-menu show"
          style="cursor: pointer"
        >
          <li v-for="milestone in sortedMilestones" :key="milestone.uuid">
            <a class="dropdown-item" @click.prevent="handleAddAIR(milestone.uuid)">
              <strong>{{ milestone.milestone_type }}</strong>
              <small class="text-muted ms-2">({{ milestone.status }})</small>
            </a>
          </li>
        </ul>
      </div>
    </div>
    <div v-if="!report.milestones || report.milestones.length === 0" class="text-muted">
      No SRP reports defined.
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
          72h and Final reports copy data from previous stages.
          Edit to update before submission.
        </small>
      </div>
      <table class="table table-striped table-hover table-sm mb-0">
        <thead class="table-dark">
          <tr>
            <th style="width: 40px"></th>
            <th>Type</th>
            <th>Status</th>
            <th>Owner</th>
            <th>Created</th>
            <th>Due Date</th>
            <th>Submitted</th>
            <th>Time Remaining</th>
            <th style="width: 200px">Actions</th>
          </tr>
        </thead>
        <tbody>
          <SRPMilestoneExpandable
            v-for="milestone in sortedMilestones"
            :key="milestone.uuid"
            :milestone="milestone"
            @edit-air="handleEditAIR($event, milestone)"
            @edit-milestone="emit('edit-milestone', $event)"
            @refresh="emit('refresh')"
            @view-payload="emit('view-payload', $event)"
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
