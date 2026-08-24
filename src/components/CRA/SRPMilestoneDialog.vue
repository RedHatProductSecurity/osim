<script setup lang="ts">
import { ref, watch, computed } from 'vue';

import Modal from '@/widgets/Modal/Modal.vue';
import type { SRPMilestoneType, SRPReportMilestone, SRPReportStatus } from '@/types/cra';
import { useUserStore } from '@/stores/UserStore';

const props = defineProps<{
  milestone?: SRPReportMilestone;
  show: boolean;
}>();

const emit = defineEmits<{
  close: [];
  save: [milestone: Partial<SRPReportMilestone>];
}>();

const userStore = useUserStore();

const formData = ref({
  due_at: '',
  manual_completion_notes: '',
  milestone_type: 'additional_information_response',
  owner: null as null | string,
  request_received_at: '',
  request_source: '',
  request_text: '',
  status: 'prepared',
  updated_dt: '',
});

function toISO8601Date(dateString: string): string {
  if (!dateString) return '';
  // date format: "2026-08-19"
  // Convert to ISO 8601 with time set to midnight UTC: "2026-08-19T00:00:00.000Z"
  const date = new Date(dateString + 'T00:00:00Z');
  return date.toISOString();
}

function fromISO8601Date(iso: null | string): string {
  if (!iso) return '';
  // ISO 8601 format: "2026-08-19T10:30:00.000Z"
  // date format: "2026-08-19"
  return iso.substring(0, 10);
}

function selfAssign() {
  if (userStore.userEmail) {
    formData.value.owner = userStore.userEmail;
  }
}

const isAssignedToMe = computed(() =>
  formData.value.owner === userStore.userEmail && userStore.userEmail !== '',
);

watch(() => props.show, (newShow) => {
  if (newShow) {
    formData.value = {
      due_at: fromISO8601Date(props.milestone?.due_at || ''),
      manual_completion_notes: props.milestone?.manual_completion_notes || '',
      milestone_type: props.milestone?.milestone_type || 'additional_information_response',
      owner: props.milestone?.owner || null,
      request_received_at: fromISO8601Date(props.milestone?.request_received_at || ''),
      request_source: props.milestone?.request_source || '',
      request_text: props.milestone?.request_text || '',
      status: props.milestone?.status || 'prepared',
      updated_dt: props.milestone?.updated_dt || '',
    };
  }
});

function handleSave() {
  // Validate required fields for new milestones
  if (!props.milestone) {
    if (!formData.value.request_received_at) {
      console.error('Request Received Date is required');
      return;
    }
    if (!formData.value.request_source || !formData.value.request_source.trim()) {
      console.error('Request Source is required');
      return;
    }
    if (!formData.value.request_text || !formData.value.request_text.trim()) {
      console.error('Request Text is required');
      return;
    }
  }

  const payload: Partial<SRPReportMilestone> = {
    manual_completion_notes: formData.value.manual_completion_notes,
    owner: formData.value.owner,
    request_source: formData.value.request_source,
    request_text: formData.value.request_text,
    status: formData.value.status as SRPReportStatus,
  };

  // Only include request_received_at if it has a value
  if (formData.value.request_received_at) {
    payload.request_received_at = toISO8601Date(formData.value.request_received_at);
  }

  if (!props.milestone) {
    payload.milestone_type = formData.value.milestone_type as SRPMilestoneType;
  } else {
    payload.updated_dt = formData.value.updated_dt;
  }

  if (formData.value.due_at) {
    payload.due_at = toISO8601Date(formData.value.due_at);
  }

  emit('save', payload);
  emit('close');
}

function handleClose() {
  emit('close');
}
</script>

<template>
  <Modal :show="show" @close="handleClose">
    <template #title>
      {{ milestone ? 'Edit' : 'Add' }} Milestone
    </template>
    <template #body>
      <div v-if="!milestone" class="alert alert-info mb-3">
        <i class="bi bi-info-circle me-2"></i>
        <small>
          Additional Information Request milestones are created when CRA requests more details.
          The due date will be calculated automatically based on the received date (30 days).
        </small>
      </div>

      <div v-if="milestone" class="mb-3">
        <label class="form-label">Milestone Type</label>
        <input
          :value="milestone.milestone_type"
          type="text"
          class="form-control"
          disabled
        />
        <small class="text-muted">Milestone type cannot be changed</small>
      </div>

      <div class="mb-3">
        <label class="form-label">Request Received Date
          <span v-if="!milestone" class="text-danger">*</span>
        </label>
        <input
          v-model="formData.request_received_at"
          type="date"
          class="form-control"
          :required="!milestone"
        />
        <small class="text-muted">When the additional information request was received</small>
      </div>

      <div class="mb-3">
        <label class="form-label">Owner</label>
        <div class="d-flex gap-2 align-items-start">
          <input
            v-model="formData.owner"
            type="email"
            class="form-control"
            placeholder="owner@example.com"
          />
          <button
            v-if="!isAssignedToMe"
            type="button"
            class="btn btn-primary text-nowrap"
            @click="selfAssign"
          >
            Self Assign
          </button>
        </div>
        <small class="text-muted">Person responsible for this milestone</small>
      </div>

      <div class="mb-3">
        <label class="form-label">
          Request Source
          <span v-if="!milestone" class="text-danger">*</span>
        </label>
        <input
          v-model="formData.request_source"
          type="text"
          class="form-control"
          placeholder="e.g., ENISA Portal"
          :required="!milestone"
        />
        <small class="text-muted">Where the request came from</small>
      </div>

      <div class="mb-3">
        <label class="form-label">
          Request Text
          <span v-if="!milestone" class="text-danger">*</span>
        </label>
        <textarea
          v-model="formData.request_text"
          class="form-control"
          :rows="milestone ? 3 : 4"
          placeholder="Enter the details of what information was requested..."
          :required="!milestone"
        ></textarea>
        <small class="text-muted">Description of the additional information requested</small>
      </div>

      <hr class="my-3" />

      <div class="mb-3">
        <label class="form-label">Status</label>
        <select v-model="formData.status" class="form-select">
          <option value="prepared">Prepared</option>
          <option value="submitted">Submitted</option>
          <option value="not_required">Not Required</option>
          <option value="blocked">Blocked</option>
          <option value="deferred">Deferred</option>
        </select>
      </div>

      <div class="mb-3">
        <label class="form-label">Due Date (Optional)</label>
        <input v-model="formData.due_at" type="date" class="form-control" />
        <small class="text-muted">Leave empty to use automatically calculated due date</small>
      </div>

      <div class="mb-3">
        <label class="form-label">Notes</label>
        <textarea v-model="formData.manual_completion_notes" class="form-control" rows="3"></textarea>
      </div>
    </template>
    <template #footer>
      <button type="button" class="btn btn-secondary" @click="handleClose">Cancel</button>
      <button type="button" class="btn btn-primary" @click="handleSave">Save</button>
    </template>
  </Modal>
</template>
