<script setup lang="ts">
import { ref, watch } from 'vue';

import Modal from '@/widgets/Modal/Modal.vue';
import type { SRPReportMilestone } from '@/types/cra';
import { formatDate } from '@/utils/helpers';

const props = defineProps<{
  milestone?: SRPReportMilestone;
  show: boolean;
}>();

const emit = defineEmits<{
  close: [];
  save: [milestone: Partial<SRPReportMilestone>];
}>();

const formData = ref({
  due_at: props.milestone?.due_at || '',
  manual_completion_notes: props.milestone?.manual_completion_notes || '',
  milestone_type: props.milestone?.milestone_type || '24h',
  status: props.milestone?.status || 'prepared',
});

watch(() => props.show, (newShow) => {
  if (newShow && props.milestone) {
    formData.value = {
      due_at: props.milestone.due_at || '',
      manual_completion_notes: props.milestone.manual_completion_notes,
      milestone_type: props.milestone.milestone_type,
      status: props.milestone.status,
    };
  }
});

function handleSave() {
  emit('save', formData.value);
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
      <div
        v-if="milestone?.milestone_type === 'additional_information_response'"
        class="mb-3 p-3 border rounded bg-light"
      >
        <h6 class="mb-2">Request Details</h6>
        <div class="mb-2">
          <small class="text-muted">Received:</small>
          <div>{{ milestone.request_received_at ? formatDate(milestone.request_received_at, false) : 'N/A' }}</div>
        </div>
        <div class="mb-2">
          <small class="text-muted">Source:</small>
          <div>{{ milestone.request_source || 'N/A' }}</div>
        </div>
        <div v-if="milestone.request_text" class="mb-0">
          <small class="text-muted">Request Text:</small>
          <div class="text-break">{{ milestone.request_text }}</div>
        </div>
      </div>
      <div class="mb-3">
        <label class="form-label">Milestone Type</label>
        <select v-model="formData.milestone_type" class="form-select">
          <option value="24h">24h</option>
          <option value="72h">72h</option>
          <option value="additional_information_response">Additional Information Response</option>
          <option value="final">Final</option>
        </select>
      </div>
      <div class="mb-3">
        <label class="form-label">Status</label>
        <select v-model="formData.status" class="form-select">
          <option value="prepared">Prepared</option>
          <option value="submitted">Submitted</option>
          <option value="not_required">Not Required</option>
        </select>
      </div>
      <div class="mb-3">
        <label class="form-label">Due Date</label>
        <input v-model="formData.due_at" type="datetime-local" class="form-control" />
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
