<script setup lang="ts">
import { ref, watch } from 'vue';

import Modal from '@/widgets/Modal/Modal.vue';
import type { SRPReport } from '@/types/cra';

const props = defineProps<{
  report?: SRPReport;
  show: boolean;
}>();

const emit = defineEmits<{
  close: [];
  save: [report: Partial<SRPReport>];
}>();

// Note: 'status' field is not included in the form because it's a computed property
// in the backend, derived automatically from the milestone statuses.
// To change the report status, update individual milestone statuses instead.
const formData = ref({
  reportable_event_type: props.report?.reportable_event_type || 'actively_exploited_vulnerability',
  responsibility_scope: props.report?.responsibility_scope || 'manufacturer',
  srp_reference_id: props.report?.srp_reference_id || '',
  srp_reference_url: props.report?.srp_reference_url || '',
  title: props.report?.title || '',
});

watch(() => props.show, (newShow) => {
  if (newShow) {
    if (props.report) {
      formData.value = {
        reportable_event_type: props.report.reportable_event_type,
        responsibility_scope: props.report.responsibility_scope,
        srp_reference_id: props.report.srp_reference_id,
        srp_reference_url: props.report.srp_reference_url,
        title: props.report.title,
      };
    } else {
      formData.value = {
        reportable_event_type: 'actively_exploited_vulnerability',
        responsibility_scope: 'manufacturer',
        srp_reference_id: '',
        srp_reference_url: '',
        title: '',
      };
    }
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
  <Modal class="modal-lg" :show="show" @close="handleClose">
    <template #title>
      {{ report ? 'Edit' : 'Add' }} SRP Report
    </template>
    <template #body>
      <div class="mb-3">
        <label class="form-label">Title</label>
        <input v-model="formData.title" type="text" class="form-control" />
      </div>
      <div class="mb-3">
        <label class="form-label">Event Type</label>
        <select v-model="formData.reportable_event_type" class="form-select">
          <option value="actively_exploited_vulnerability">Actively Exploited Vulnerability</option>
          <option value="additional_information_request">Additional Information Request</option>
          <option value="severe_incident">Severe Incident</option>
        </select>
      </div>
      <div class="mb-3">
        <label class="form-label">Responsibility Scope</label>
        <select v-model="formData.responsibility_scope" class="form-select">
          <option value="manufacturer">Manufacturer</option>
          <option value="steward">Steward</option>
        </select>
      </div>
      <div class="mb-3">
        <label class="form-label">SRP Reference ID</label>
        <input v-model="formData.srp_reference_id" type="text" class="form-control" />
      </div>
      <div class="mb-3">
        <label class="form-label">SRP Reference URL</label>
        <input v-model="formData.srp_reference_url" type="url" class="form-control" />
      </div>
    </template>
    <template #footer>
      <button type="button" class="btn btn-secondary" @click="handleClose">Cancel</button>
      <button type="button" class="btn btn-primary" @click="handleSave">Save</button>
    </template>
  </Modal>
</template>
