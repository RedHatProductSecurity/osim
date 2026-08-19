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

function toISO8601DateTime(datetimeLocal: string): string {
  if (!datetimeLocal) return '';
  const date = new Date(datetimeLocal + 'Z');
  return date.toISOString();
}

function fromISO8601DateTime(iso: null | string): string {
  if (!iso) return '';
  return iso.substring(0, 16);
}

// Note: 'status' field is not included in the form because it's a computed property
// in the backend, derived automatically from the milestone statuses.
// To change the report status, update individual milestone statuses instead.
const formData = ref({
  evidence: props.report?.evidence || '',
  reportable_event_type: props.report?.reportable_event_type || 'EXPLOITS_KEV_APPROVED',
  responsibility_scope: props.report?.responsibility_scope || 'manufacturer',
  srp_reference_id: props.report?.srp_reference_id || '',
  srp_reference_url: props.report?.srp_reference_url || '',
  timer_started_at: props.report?.timer_started_at || '',
  title: props.report?.title || '',
  updated_dt: props.report?.updated_dt || '',
});

watch(() => props.show, (newShow) => {
  if (newShow) {
    if (props.report) {
      formData.value = {
        evidence: props.report.evidence || '',
        reportable_event_type: props.report.reportable_event_type,
        responsibility_scope: props.report.responsibility_scope,
        srp_reference_id: props.report.srp_reference_id,
        srp_reference_url: props.report.srp_reference_url,
        timer_started_at: fromISO8601DateTime(props.report.timer_started_at || ''),
        title: props.report.title,
        updated_dt: props.report.updated_dt,
      };
    } else {
      formData.value = {
        evidence: '',
        reportable_event_type: 'EXPLOITS_KEV_APPROVED',
        responsibility_scope: 'manufacturer',
        srp_reference_id: '',
        srp_reference_url: '',
        timer_started_at: '',
        title: '',
        updated_dt: '',
      };
    }
  }
});

function handleSave() {
  const payload = { ...formData.value };

  // Convert datetime-local to ISO 8601 format
  if (payload.timer_started_at) {
    payload.timer_started_at = toISO8601DateTime(payload.timer_started_at);
  }

  emit('save', payload);
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
          <option value="EXPLOITS_KEV_APPROVED">Actively Exploited Vulnerability</option>
          <option value="MAJOR_INCIDENT_APPROVED">Severe Incident</option>
          <option value="ADDITIONAL_INFORMATION_REQUEST">Additional Information Request</option>
        </select>
      </div>
      <div class="mb-3">
        <label class="form-label">Evidence <span class="text-danger">*</span></label>
        <textarea
          v-model="formData.evidence"
          class="form-control"
          rows="4"
          placeholder="Provide evidence for the reportable event..."
          required
        ></textarea>
        <small class="text-muted">Required: Evidence supporting this report</small>
      </div>
      <div v-if="report" class="mb-3">
        <label class="form-label">Timer Started At</label>
        <input v-model="formData.timer_started_at" type="datetime-local" class="form-control" />
        <small class="text-muted">Start time to kick off the SLA for milestones</small>
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
