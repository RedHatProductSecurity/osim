<script setup lang="ts">
import { ref } from 'vue';

import SRPStatusBadge from '@/components/CRA/SRPStatusBadge.vue';

import type { SRPReport, SRPReportMilestone } from '@/types/cra';
import { isMilestoneActionable } from '@/types/cra';
import { updateSRPMilestone } from '@/services/SRPService';
import { formatDate } from '@/utils/helpers';

defineProps<{
  report: SRPReport;
}>();

const emit = defineEmits<{
  'add-milestone': [reportUuid: string];
  'edit-milestone': [milestone: SRPReportMilestone];
  'refresh': [];
}>();

const expandedMilestones = ref<Set<string>>(new Set());

function toggleExpanded(uuid: string) {
  if (expandedMilestones.value.has(uuid)) {
    expandedMilestones.value.delete(uuid);
  } else {
    expandedMilestones.value.add(uuid);
  }
}

function isExpanded(uuid: string): boolean {
  return expandedMilestones.value.has(uuid);
}

function formatTimeRemaining(milestone: SRPReportMilestone): string {
  if (milestone.is_overdue) return 'Overdue';
  if (milestone.days_remaining === null) return '-';
  const hours = milestone.hours_remaining ? ` ${milestone.hours_remaining % 24}h` : '';
  return `${milestone.days_remaining}d${hours}`;
}

async function handleQuickAction(milestone: SRPReportMilestone, action: 'block' | 'defer' | 'submit') {
  const statusMap = {
    block: 'blocked',
    defer: 'deferred',
    submit: 'submitted',
  };
  try {
    await updateSRPMilestone(milestone.srp_report, milestone.uuid, {
      status: statusMap[action] as any,
      updated_dt: milestone.updated_dt,
    });
    emit('refresh');
  } catch (err) {
    console.error('Failed to update SRP milestone status:', err);
  }
}
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
            <th style="width: 30px"></th>
            <th>Type</th>
            <th>Status</th>
            <th>Due Date</th>
            <th>Time Remaining</th>
            <th style="width: 200px">Actions</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="milestone in report.milestones" :key="milestone.uuid">
            <tr
              class="milestone-row"
              :class="{ 'table-danger': isMilestoneActionable(milestone) }"
            >
              <td>
                <button
                  type="button"
                  class="expand-btn btn btn-sm p-0 border-0 bg-transparent"
                  :aria-label="isExpanded(milestone.uuid) ? 'Collapse details' : 'Expand details'"
                  :aria-expanded="isExpanded(milestone.uuid)"
                  @click="toggleExpanded(milestone.uuid)"
                >
                  <i
                    class="bi"
                    :class="isExpanded(milestone.uuid) ? 'bi-chevron-down' : 'bi-chevron-right'"
                  ></i>
                </button>
              </td>
              <td>{{ milestone.milestone_type }}</td>
              <td>
                <SRPStatusBadge :status="milestone.status" />
              </td>
              <td>{{ milestone.due_at ? formatDate(new Date(milestone.due_at), false) : 'N/A' }}</td>
              <td :class="{ 'text-danger': isMilestoneActionable(milestone) }">
                {{ formatTimeRemaining(milestone) }}
              </td>
              <td>
                <div class="btn-group btn-group-sm me-1" role="group">
                  <button
                    v-if="milestone.status !== 'submitted'"
                    type="button"
                    class="btn btn-success"
                    title="Mark Submitted"
                    @click="handleQuickAction(milestone, 'submit')"
                    @keydown.enter.prevent="handleQuickAction(milestone, 'submit')"
                  >
                    <i class="bi bi-check-circle"></i>
                  </button>
                  <button
                    v-if="milestone.status !== 'deferred'"
                    type="button"
                    class="btn btn-warning"
                    title="Defer"
                    @click="handleQuickAction(milestone, 'defer')"
                    @keydown.enter.prevent="handleQuickAction(milestone, 'defer')"
                  >
                    <i class="bi bi-clock"></i>
                  </button>
                  <button
                    v-if="milestone.status !== 'blocked'"
                    type="button"
                    class="btn btn-danger"
                    title="Block"
                    @click="handleQuickAction(milestone, 'block')"
                    @keydown.enter.prevent="handleQuickAction(milestone, 'block')"
                  >
                    <i class="bi bi-slash-circle"></i>
                  </button>
                </div>
                <button
                  type="button"
                  class="btn btn-sm btn-dark"
                  title="Edit"
                  @click="emit('edit-milestone', milestone)"
                >
                  <i class="bi bi-pencil"></i>
                </button>
              </td>
            </tr>
            <tr v-if="isExpanded(milestone.uuid)" class="milestone-detail">
              <td colspan="6" class="p-0">
                <div class="px-4 py-3 bg-white border-top">
                  <div v-if="milestone.request_source" class="mb-2">
                    <span class="fw-semibold text-muted small">Request Source</span>
                    <p class="mb-0">{{ milestone.request_source }}</p>
                  </div>
                  <div v-if="milestone.request_received_at" class="mb-2">
                    <span class="fw-semibold text-muted small">Request Received</span>
                    <p class="mb-0">{{ formatDate(new Date(milestone.request_received_at), false) }}</p>
                  </div>
                  <div v-if="milestone.request_text" class="mb-2">
                    <span class="fw-semibold text-muted small">Request Text</span>
                    <p class="mb-0 white-space-pre-wrap">{{ milestone.request_text }}</p>
                  </div>
                  <div v-if="milestone.manual_completion_notes">
                    <span class="fw-semibold text-muted small">Notes</span>
                    <p class="mb-0 white-space-pre-wrap">{{ milestone.manual_completion_notes }}</p>
                  </div>
                  <p
                    v-if="!milestone.request_source && !milestone.request_received_at
                      && !milestone.request_text && !milestone.manual_completion_notes"
                    class="mb-0 text-muted fst-italic"
                  >
                    No additional details.
                  </p>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.milestone-detail td {
  border-top: none;
}

.white-space-pre-wrap {
  white-space: pre-wrap;
}

.btn:hover {
  opacity: 0.85;
}
</style>
