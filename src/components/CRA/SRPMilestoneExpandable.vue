<script setup lang="ts">
import { ref } from 'vue';

import SRPStatusBadge from '@/components/CRA/SRPStatusBadge.vue';

import type { SRPReportMilestone } from '@/types/cra';
import { isMilestoneActionable } from '@/types/cra';
import { updateSRPMilestone } from '@/services/SRPService';
import { formatDate } from '@/utils/helpers';

const props = defineProps<{
  milestone: SRPReportMilestone;
}>();

const emit = defineEmits<{
  'edit-milestone': [milestone: SRPReportMilestone];
  'refresh': [];
}>();

const isExpanded = ref(false);

function toggleExpanded() {
  isExpanded.value = !isExpanded.value;
}

function formatTimeRemaining(): string {
  if (props.milestone.is_overdue) return 'Overdue';
  if (props.milestone.days_remaining === null) return '-';
  const hours = props.milestone.hours_remaining ? ` ${props.milestone.hours_remaining % 24}h` : '';
  return `${props.milestone.days_remaining}d${hours}`;
}

async function handleQuickAction(action: 'block' | 'defer' | 'submit') {
  const statusMap = {
    block: 'blocked',
    defer: 'deferred',
    submit: 'submitted',
  };
  try {
    await updateSRPMilestone(props.milestone.srp_report, props.milestone.uuid, {
      status: statusMap[action] as any,
      updated_dt: props.milestone.updated_dt,
    });
    emit('refresh');
  } catch (err) {
    console.error('Failed to update SRP milestone status:', err);
  }
}

function parseDetailsJson(detailsJson: any): Record<string, any> {
  if (!detailsJson) return {};
  if (typeof detailsJson === 'string') {
    try {
      return JSON.parse(detailsJson);
    } catch {
      return {};
    }
  }
  return detailsJson;
}
</script>

<template>
  <tr
    class="milestone-row"
    :class="{ 'table-danger': isMilestoneActionable(milestone) }"
    role="button"
    @click="toggleExpanded"
  >
    <td>
      <i
        class="bi"
        :class="isExpanded ? 'bi-chevron-down' : 'bi-chevron-right'"
      ></i>
    </td>
    <td class="ps-2">{{ milestone.milestone_type }}</td>
    <td>
      <SRPStatusBadge :status="milestone.status" />
    </td>
    <td>{{ milestone.due_at ? formatDate(new Date(milestone.due_at), false) : 'N/A' }}</td>
    <td :class="{ 'text-danger': isMilestoneActionable(milestone) }">
      {{ formatTimeRemaining() }}
    </td>
    <td @click.stop>
      <div class="btn-group btn-group-sm me-1" role="group">
        <button
          v-if="milestone.status !== 'submitted'"
          type="button"
          class="btn btn-success"
          title="Mark Submitted"
          @click="handleQuickAction('submit')"
        >
          <i class="bi bi-check-circle"></i>
        </button>
        <button
          v-if="milestone.status !== 'deferred'"
          type="button"
          class="btn btn-warning"
          title="Defer"
          @click="handleQuickAction('defer')"
        >
          <i class="bi bi-clock"></i>
        </button>
        <button
          v-if="milestone.status !== 'blocked'"
          type="button"
          class="btn btn-danger"
          title="Block"
          @click="handleQuickAction('block')"
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
  <tr v-if="isExpanded" class="milestone-details-expanded">
    <td colspan="6" class="p-3 bg-white">
      <div class="row">
        <div class="col-md-6">
          <h6 class="mb-3">Milestone Information</h6>
          <div class="mb-2">
            <strong>UUID:</strong> <code class="small">{{ milestone.uuid }}</code>
          </div>
          <div v-if="milestone.owner" class="mb-2">
            <strong>Owner:</strong> {{ milestone.owner }}
          </div>
          <div class="mb-2">
            <strong>Created:</strong> {{ formatDate(new Date(milestone.created_dt), true) }}
          </div>
          <div class="mb-2">
            <strong>Last Updated:</strong> {{ formatDate(new Date(milestone.updated_dt), true) }}
          </div>
          <div v-if="milestone.request_received_at" class="mb-2">
            <strong>Request Received:</strong>
            {{ formatDate(new Date(milestone.request_received_at), true) }}
          </div>
          <div v-if="milestone.request_source" class="mb-2">
            <strong>Request Source:</strong> {{ milestone.request_source }}
          </div>
          <div v-if="milestone.request_text" class="mb-2">
            <strong>Request Text:</strong>
            <div class="mt-1 p-2 bg-light border rounded">
              {{ milestone.request_text }}
            </div>
          </div>
          <div v-if="milestone.manual_completion_notes" class="mb-2">
            <strong>Completion Notes:</strong>
            <div class="mt-1 p-2 bg-light border rounded">
              {{ milestone.manual_completion_notes }}
            </div>
          </div>
        </div>
        <div class="col-md-6">
          <h6 class="mb-3">Additional Details</h6>
          <div v-if="milestone.missing_required_fields" class="alert alert-warning alert-sm mb-2">
            <strong>Missing Fields:</strong> {{ milestone.missing_required_fields }}
          </div>
          <div v-if="(milestone as any).details_json">
            <div
              v-for="(value, key) in parseDetailsJson((milestone as any).details_json)"
              :key="key"
              class="mb-2"
            >
              <strong>{{ key }}:</strong>
              <span v-if="typeof value === 'object'" class="ms-1">
                <pre class="small mb-0 mt-1 p-2 bg-light border rounded">{{ JSON.stringify(value, null, 2) }}</pre>
              </span>
              <span v-else class="ms-1">{{ value }}</span>
            </div>
          </div>
          <div v-else class="text-muted small">
            <em>No additional details available.</em>
          </div>
        </div>
      </div>
    </td>
  </tr>
</template>

<style scoped>
.milestone-row {
  cursor: pointer;
}

.milestone-row:hover {
  background-color: rgb(0 0 0 / 5%);
}

.milestone-details-expanded {
  background-color: #f8f9fa;
}
</style>
