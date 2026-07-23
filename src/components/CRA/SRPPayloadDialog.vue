<script setup lang="ts">
import Modal from '@/widgets/Modal/Modal.vue';
import type { SRPReport } from '@/types/cra';
import { formatDate } from '@/utils/helpers';

defineProps<{
  report?: SRPReport;
  show: boolean;
}>();

const emit = defineEmits<{
  close: [];
}>();

function formatValue(value: any): string {
  if (value === null || value === undefined || value === '') return 'N/A';
  if (Array.isArray(value)) return value.length ? value.join(', ') : 'N/A';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}
</script>

<template>
  <Modal class="modal-lg" :show="show" @close="emit('close')">
    <template #title>
      ENISA Payload Preview
    </template>
    <template #body>
      <div v-if="!report" class="text-muted">No report data available.</div>
      <div v-else>
        <div class="row mb-2">
          <div class="col-4 fw-bold">Field</div>
          <div class="col-8 fw-bold">Value</div>
        </div>
        <div class="row mb-1 border-top pt-2">
          <div class="col-4 text-muted">Title</div>
          <div class="col-8">{{ formatValue(report.title) }}</div>
        </div>
        <div class="row mb-1">
          <div class="col-4 text-muted">Event Type</div>
          <div class="col-8">{{ formatValue(report.reportable_event_type) }}</div>
        </div>
        <div class="row mb-1">
          <div class="col-4 text-muted">Responsibility Scope</div>
          <div class="col-8">{{ formatValue(report.responsibility_scope) }}</div>
        </div>
        <div class="row mb-1">
          <div class="col-4 text-muted">Status</div>
          <div class="col-8">{{ formatValue(report.status) }}</div>
        </div>
        <div class="row mb-1">
          <div class="col-4 text-muted">SRP Reference ID</div>
          <div class="col-8">{{ formatValue(report.srp_reference_id) }}</div>
        </div>
        <div class="row mb-1">
          <div class="col-4 text-muted">SRP Reference URL</div>
          <div class="col-8">
            <a v-if="report.srp_reference_url" :href="report.srp_reference_url" target="_blank">
              {{ report.srp_reference_url }}
            </a>
            <span v-else>N/A</span>
          </div>
        </div>
        <div class="row mb-1">
          <div class="col-4 text-muted">Manufacturer/Steward</div>
          <div class="col-8">{{ formatValue(report.manufacturer_or_steward_name) }}</div>
        </div>
        <div class="row mb-1">
          <div class="col-4 text-muted">CSIRT Country</div>
          <div class="col-8">{{ formatValue(report.designated_csirt_country) }}</div>
        </div>
        <div class="row mb-1">
          <div class="col-4 text-muted">CSIRT Source</div>
          <div class="col-8">{{ formatValue(report.designated_csirt_source) }}</div>
        </div>
        <div class="row mb-1">
          <div class="col-4 text-muted">Member States Available</div>
          <div class="col-8">{{ formatValue(report.member_states_available) }}</div>
        </div>
        <div class="row mb-1">
          <div class="col-4 text-muted">Timer Started</div>
          <div class="col-8">
            {{ report.timer_started_at ? formatDate(report.timer_started_at, false) : 'N/A' }}
          </div>
        </div>
        <div v-if="report.missing_required_fields" class="alert alert-warning mt-3">
          <strong>Missing Required Fields:</strong> {{ report.missing_required_fields }}
        </div>
      </div>
    </template>
    <template #footer>
      <button type="button" class="btn btn-secondary" @click="emit('close')">Close</button>
    </template>
  </Modal>
</template>
