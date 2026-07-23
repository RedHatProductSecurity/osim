<script setup lang="ts">
import type { SRPReport, SRPReportMilestone } from '@/types/cra';
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

function formatTimeRemaining(milestone: any): string {
  if (milestone.is_overdue) return 'Overdue';
  if (milestone.days_remaining === null) return '-';
  const hours = milestone.hours_remaining ? ` ${milestone.hours_remaining % 24}h` : '';
  return `${milestone.days_remaining}d${hours}`;
}

function formatStatus(status: null | string | undefined): string {
  return status?.replace('_', ' ') ?? '';
}

async function handleQuickAction(milestone: SRPReportMilestone, action: 'block' | 'defer' | 'submit') {
  const statusMap = {
    block: 'blocked',
    defer: 'deferred',
    submit: 'submitted',
  };
  await updateSRPMilestone(milestone.uuid, { status: statusMap[action] as any });
  emit('refresh');
}
</script>

<template>
  <div class="p-3 bg-light">
    <div class="d-flex justify-content-between align-items-center mb-2">
      <h6 class="mb-0">Milestones</h6>
      <button
        type="button"
        class="btn btn-sm btn-outline-primary"
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
      <table class="table table-sm table-bordered bg-white mb-0">
        <thead>
          <tr>
            <th>Type</th>
            <th>Status</th>
            <th>Due Date</th>
            <th>Time Remaining</th>
            <th style="width: 200px">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="milestone in report.milestones"
            :key="milestone.uuid"
            :class="{ 'table-danger': milestone.is_overdue && milestone.status !== 'submitted' }"
          >
            <td>{{ milestone.milestone_type }}</td>
            <td>
              <span class="badge bg-secondary">{{ formatStatus(milestone.status) }}</span>
            </td>
            <td>{{ milestone.due_at ? formatDate(new Date(milestone.due_at), false) : 'N/A' }}</td>
            <td :class="{ 'text-danger': milestone.is_overdue }">
              {{ formatTimeRemaining(milestone) }}
            </td>
            <td>
              <div class="btn-group btn-group-sm me-1" role="group">
                <button
                  v-if="milestone.status !== 'submitted'"
                  type="button"
                  class="btn btn-outline-success"
                  title="Mark Submitted"
                  @click="handleQuickAction(milestone, 'submit')"
                >
                  <i class="bi bi-check-circle"></i>
                </button>
                <button
                  v-if="milestone.status !== 'deferred'"
                  type="button"
                  class="btn btn-outline-warning"
                  title="Defer"
                  @click="handleQuickAction(milestone, 'defer')"
                >
                  <i class="bi bi-clock"></i>
                </button>
                <button
                  v-if="milestone.status !== 'blocked'"
                  type="button"
                  class="btn btn-outline-danger"
                  title="Block"
                  @click="handleQuickAction(milestone, 'block')"
                >
                  <i class="bi bi-slash-circle"></i>
                </button>
              </div>
              <button
                type="button"
                class="btn btn-sm btn-outline-secondary"
                title="Edit"
                @click="emit('edit-milestone', milestone)"
              >
                <i class="bi bi-pencil"></i>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
