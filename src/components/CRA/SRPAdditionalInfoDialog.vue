<script setup lang="ts">
import { ref, watch, computed } from 'vue';

import { useUserStore } from '@/stores/UserStore';
import type { SRPReportMilestone } from '@/types/cra';
import Modal from '@/widgets/Modal/Modal.vue';

const props = withDefaults(
  defineProps<{
    milestone?: SRPReportMilestone;
    reportUuid: string;
    show: boolean;
  }>(),
  {
    milestone: undefined,
  },
);

const emit = defineEmits<{
  close: [];
  save: [milestone: Partial<SRPReportMilestone>];
}>();

const userStore = useUserStore();

// ── Form state ───────────────────────────────────────────────────────────────

const isSaving = ref(false);

const formData = ref({
  milestone_type: 'additional_information_response',
  request_source: '',
  request_text: '',
  request_received_at: '',
  response_text: '',
  due_at: '',
  owner: null as null | string,
  status: 'required' as const,
  manual_completion_notes: '',
});

// ── Date helpers ─────────────────────────────────────────────────────────────

function toISO8601Date(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString + 'T00:00:00Z');
  return date.toISOString();
}

function fromISO8601Date(iso: null | string): string {
  if (!iso) return '';
  return iso.substring(0, 10);
}

// ── Owner helpers ────────────────────────────────────────────────────────────

function selfAssign() {
  if (userStore.userEmail) {
    formData.value.owner = userStore.userEmail;
  }
}

const isAssignedToMe = computed(() =>
  formData.value.owner === userStore.userEmail && userStore.userEmail !== '',
);

// ── Dialog lifecycle ─────────────────────────────────────────────────────────

watch(() => props.show, (newShow) => {
  if (newShow) {
    isSaving.value = false;
    if (props.milestone) {
      // Edit mode
      formData.value = {
        milestone_type: 'additional_information_response',
        request_source: props.milestone.request_source || '',
        request_text: props.milestone.request_text || '',
        request_received_at: fromISO8601Date(props.milestone.request_received_at),
        response_text: props.milestone.response_text || '',
        due_at: fromISO8601Date(props.milestone.due_at),
        owner: props.milestone.owner || null,
        status: (props.milestone.status || 'required') as any,
        manual_completion_notes: props.milestone.manual_completion_notes || '',
      };
    } else {
      // Add mode - reset to defaults
      formData.value = {
        milestone_type: 'additional_information_response',
        request_source: '',
        request_text: '',
        request_received_at: '',
        response_text: '',
        due_at: '',
        owner: null,
        status: 'required',
        manual_completion_notes: '',
      };
    }
  }
});

function handleSave() {
  // Validate required fields
  if (!formData.value.request_source?.trim()) {
    return;
  }
  if (!formData.value.request_text?.trim()) {
    return;
  }
  if (!formData.value.request_received_at) {
    return;
  }

  // Prevent concurrent saves
  if (isSaving.value) {
    return;
  }

  isSaving.value = true;

  const payload: Partial<SRPReportMilestone> = {
    milestone_type: 'additional_information_response',
    request_source: formData.value.request_source,
    request_text: formData.value.request_text,
    request_received_at: toISO8601Date(formData.value.request_received_at),
    srp_report: props.reportUuid,
    response_text: formData.value.response_text,
    owner: formData.value.owner,
    status: formData.value.status,
    manual_completion_notes: formData.value.manual_completion_notes,
  };

  // Due date is optional
  if (formData.value.due_at) {
    payload.due_at = toISO8601Date(formData.value.due_at);
  }

  emit('save', payload);
}

function handleClose() {
  isSaving.value = false;
  emit('close');
}
</script>

<template>
  <Modal class="modal-lg" :show="show" @close="handleClose">
    <template #title>
      {{ milestone ? 'Edit Additional Information Response' : 'Add Additional Information Response' }}
    </template>
    <template #body>
      <form @submit.prevent="handleSave">
        <!-- Request Source -->
        <div class="mb-3">
          <label for="request_source" class="form-label">
            Request Source <span class="text-danger">*</span>
          </label>
          <input
            id="request_source"
            v-model="formData.request_source"
            type="text"
            class="form-control"
            placeholder="e.g., ENISA, National Authority"
            required
          />
          <small class="form-text text-muted">
            Entity or authority that requested additional information
          </small>
        </div>

        <!-- Request Text -->
        <div class="mb-3">
          <label for="request_text" class="form-label">
            Request Text <span class="text-danger">*</span>
          </label>
          <textarea
            id="request_text"
            v-model="formData.request_text"
            class="form-control"
            rows="4"
            placeholder="Describe the information being requested"
            required
          ></textarea>
        </div>

        <!-- Request Received Date -->
        <div class="mb-3">
          <label for="request_received_at" class="form-label">
            Request Received Date <span class="text-danger">*</span>
          </label>
          <input
            id="request_received_at"
            v-model="formData.request_received_at"
            type="date"
            class="form-control"
            required
          />
          <small class="form-text text-muted">
            Date when the additional information request was received
          </small>
        </div>

        <!-- Response Text -->
        <div class="mb-3">
          <label for="response_text" class="form-label">
            Response Text
          </label>
          <textarea
            id="response_text"
            v-model="formData.response_text"
            class="form-control"
            rows="4"
            placeholder="Your response to the information request"
          ></textarea>
        </div>

        <!-- Due Date (Optional) -->
        <div class="mb-3">
          <label for="due_at" class="form-label">
            Due Date (Optional)
          </label>
          <input
            id="due_at"
            v-model="formData.due_at"
            type="date"
            class="form-control"
          />
          <small class="form-text text-muted">
            Custom due date (if different from the default 30-day calculation)
          </small>
        </div>

        <!-- Owner -->
        <div class="mb-3">
          <label for="owner" class="form-label">
            Owner
          </label>
          <div class="input-group">
            <input
              id="owner"
              v-model="formData.owner"
              type="text"
              class="form-control"
              placeholder="email@example.com"
            />
            <button
              type="button"
              class="btn btn-outline-secondary"
              :disabled="isAssignedToMe || !userStore.userEmail"
              :title="!userStore.userEmail ? 'You must be logged in to self-assign' : ''"
              @click="selfAssign"
            >
              <i class="bi bi-person-check me-1"></i>
              Self Assign
            </button>
          </div>
          <small class="form-text text-muted">
            Person responsible for responding to this information request
          </small>
        </div>

        <!-- Status -->
        <div class="mb-3">
          <label for="status" class="form-label">
            Status
          </label>
          <select
            id="status"
            v-model="formData.status"
            class="form-select"
          >
            <option value="required">Required</option>
            <option value="in_progress">In Progress</option>
            <option value="in_review">In Review</option>
            <option value="submitted">Submitted</option>
            <option value="obsolete">Obsolete</option>
          </select>
        </div>

        <!-- Manual Completion Notes -->
        <div class="mb-3">
          <label for="manual_completion_notes" class="form-label">
            Completion Notes
          </label>
          <textarea
            id="manual_completion_notes"
            v-model="formData.manual_completion_notes"
            class="form-control"
            rows="3"
            placeholder="Additional notes about completion or submission"
          ></textarea>
        </div>
      </form>
    </template>

    <template #footer>
      <button
        type="button"
        class="btn btn-secondary"
        @click="handleClose"
      >
        Cancel
      </button>
      <button
        type="button"
        class="btn btn-primary"
        :disabled="isSaving"
        @click="handleSave"
      >
        <i class="bi bi-save me-1"></i>
        {{ isSaving ? 'Saving...' : 'Save' }}
      </button>
    </template>
  </Modal>
</template>
