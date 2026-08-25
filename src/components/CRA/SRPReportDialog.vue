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
  // Parse datetime-local as local time (not UTC)
  // datetime-local format: "2026-08-19T10:30"
  const date = new Date(datetimeLocal);
  // Get local time components
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  // Return ISO 8601 format in local timezone
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

function fromISO8601DateTime(iso: null | string): string {
  if (!iso) return '';
  // ISO format may include timezone, extract just date and time
  return iso.substring(0, 16);
}

function memberStatesToString(states: string[]): string {
  return states.join(', ');
}

function stringToMemberStates(value: string): string[] {
  return value
    .split(',')
    .map(s => s.trim().toUpperCase())
    .filter(s => s.length > 0);
}

// Note: 'status' field is not included in the form because it's a computed property
// in the backend, derived automatically from the milestone statuses.
// To change the report status, update individual milestone statuses instead.
const formData = ref({
  evidence: props.report?.evidence || '',
  manufacturer_or_steward_name: props.report?.manufacturer_or_steward_name || '',
  member_states_available_text: memberStatesToString(props.report?.member_states_available || []),
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
        manufacturer_or_steward_name: props.report.manufacturer_or_steward_name || '',
        member_states_available_text: memberStatesToString(props.report.member_states_available || []),
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
        manufacturer_or_steward_name: '',
        member_states_available_text: '',
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
  // Validate required fields
  if (!formData.value.evidence || !formData.value.evidence.trim()) {
    console.error('Evidence is required');
    return;
  }

  const payload: any = { ...formData.value };

  // Convert member states text to array
  payload.member_states_available = stringToMemberStates(formData.value.member_states_available_text);
  delete payload.member_states_available_text;

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

function setTimerToday() {
  const now = new Date();
  // Format as datetime-local (YYYY-MM-DDTHH:MM)
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  formData.value.timer_started_at = `${year}-${month}-${day}T${hours}:${minutes}`;
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
      <div class="mb-3">
        <label class="form-label">14-Day Timer Start</label>
        <div class="d-flex gap-2 align-items-start">
          <input
            v-model="formData.timer_started_at"
            type="datetime-local"
            class="form-control"
            placeholder="Not started"
          />
          <button
            type="button"
            class="btn btn-primary text-nowrap"
            @click="setTimerToday"
          >
            Set Today
          </button>
        </div>
        <small class="text-muted">
          Start the 14-day countdown for final report (set when mitigation/patch is available)
        </small>
      </div>
      <div class="mb-3">
        <label class="form-label">Responsibility Scope</label>
        <select v-model="formData.responsibility_scope" class="form-select">
          <option value="manufacturer">Manufacturer</option>
          <option value="steward">Steward</option>
        </select>
      </div>
      <div class="mb-3">
        <label class="form-label">Organization Name</label>
        <input
          v-model="formData.manufacturer_or_steward_name"
          type="text"
          class="form-control"
          placeholder="e.g., Red Hat, Inc."
        />
        <small class="text-muted">Name of the manufacturer or steward organization</small>
      </div>
      <div class="mb-3">
        <label class="form-label">EU Member States Where Product is Available</label>
        <input
          v-model="formData.member_states_available_text"
          type="text"
          class="form-control"
          placeholder="e.g., ES, FR, DE, IT"
        />
        <small class="text-muted">
          Enter 2-letter country codes separated by commas (e.g., ES, FR, DE)
        </small>
      </div>
      <!-- TODO: OSIDB-5423 - Backend pending: These fields should not be required on report creation -->
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
