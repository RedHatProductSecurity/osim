<script setup lang="ts">
import { ref, watch } from 'vue';

import EUStatesSelector from '@/components/CRA/EUStatesSelector.vue';

import Modal from '@/widgets/Modal/Modal.vue';
import type { SRPReport } from '@/types/cra';

type SRPReportFormData = {
  evidence: string;
  manufacturer_or_steward_name: string;
  member_states_available: string[];
  reportable_event_type: SRPReport['reportable_event_type'];
  responsibility_scope: SRPReport['responsibility_scope'];
  srp_reference_id: string;
  srp_reference_url: string;
  title: string;
  updated_dt: string;
};

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
const formData = ref<SRPReportFormData>({
  evidence: props.report?.evidence || '',
  manufacturer_or_steward_name: props.report?.manufacturer_or_steward_name || '',
  member_states_available: props.report?.member_states_available || [],
  reportable_event_type: props.report?.reportable_event_type || 'EXPLOITS_KEV_APPROVED',
  responsibility_scope: props.report?.responsibility_scope || 'manufacturer',
  srp_reference_id: props.report?.srp_reference_id || '',
  srp_reference_url: props.report?.srp_reference_url || '',
  title: props.report?.title || '',
  updated_dt: props.report?.updated_dt || '',
});

watch(() => props.show, (newShow) => {
  if (newShow) {
    if (props.report) {
      formData.value = {
        evidence: props.report.evidence || '',
        manufacturer_or_steward_name: props.report.manufacturer_or_steward_name || '',
        member_states_available: props.report.member_states_available || [],
        reportable_event_type: props.report.reportable_event_type,
        responsibility_scope: props.report.responsibility_scope,
        srp_reference_id: props.report.srp_reference_id,
        srp_reference_url: props.report.srp_reference_url,
        title: props.report.title,
        updated_dt: props.report.updated_dt,
      };
    } else {
      formData.value = {
        evidence: '',
        manufacturer_or_steward_name: '',
        member_states_available: [],
        reportable_event_type: 'EXPLOITS_KEV_APPROVED',
        responsibility_scope: 'manufacturer',
        srp_reference_id: '',
        srp_reference_url: '',
        title: '',
        updated_dt: '',
      };
    }
  }
});

function handleSave() {
  // Validate required fields
  if (!formData.value.title || !formData.value.title.trim()) {
    console.error('Title is required');
    return;
  }
  if (!formData.value.evidence || !formData.value.evidence.trim()) {
    console.error('Evidence is required');
    return;
  }

  const payload = { ...formData.value };

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
      {{ report ? 'Edit' : 'Add' }} SRP Reportable Event
    </template>
    <template #body>
      <div class="mb-3">
        <label class="form-label">Title <span class="text-danger">*</span></label>
        <input v-model="formData.title" type="text" class="form-control" />
      </div>
      <div class="mb-3">
        <label class="form-label">Event Type <span class="text-danger">*</span></label>
        <select v-model="formData.reportable_event_type" class="form-select">
          <option value="EXPLOITS_KEV_APPROVED">Actively Exploited Vulnerability</option>
          <option value="MAJOR_INCIDENT_APPROVED">Severe Incident</option>
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
        <EUStatesSelector v-model="formData.member_states_available" />
      </div>
      <!-- Optional fields (OSIDB-5436) -->
      <div class="mb-3">
        <label class="form-label">SRP Reference ID (Optional)</label>
        <input
          v-model="formData.srp_reference_id"
          type="text"
          class="form-control"
        />
      </div>
      <div class="mb-3">
        <label class="form-label">SRP Reference URL (Optional)</label>
        <input v-model="formData.srp_reference_url" type="url" class="form-control" />
      </div>
    </template>
    <template #footer>
      <button type="button" class="btn btn-secondary" @click="handleClose">Cancel</button>
      <button type="button" class="btn btn-primary" @click="handleSave">Save</button>
    </template>
  </Modal>
</template>
