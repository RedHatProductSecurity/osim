<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import {
  buildPayloadRows,
  formatEventTypeLabel,
  formatMilestoneTypeLabel,
  formatPayloadValue,
  formatRequirement,
  isPayloadMilestoneType,
  isPayloadRowEditable,
  parseFieldList,
  requirementBadgeClass,
  type SRPPayloadFieldRow,
} from '@/components/CRA/srpPayloadFields';

import { useUserStore } from '@/stores/UserStore';
import type { SRPMilestoneStatus, SRPReport, SRPReportMilestone } from '@/types/cra';
import { formatDate } from '@/utils/helpers';
import Modal from '@/widgets/Modal/Modal.vue';

const props = defineProps<{
  milestone?: SRPReportMilestone;
  report?: SRPReport;
  show: boolean;
}>();

const emit = defineEmits<{
  close: [];
  save: [milestone: Partial<SRPReportMilestone>];
}>();

const userStore = useUserStore();

const rows = computed(() => {
  if (!props.report || !props.milestone) return [];
  return buildPayloadRows(props.milestone);
});

const missingRows = computed(() => rows.value.filter(row => row.isMissing));

type FieldValue = string | string[];

const payloadJson = computed(() => {
  if (!props.report || !props.milestone) return '{}';
  return JSON.stringify(getCurrentPayload(), null, 2);
});

const fieldValues = ref<Record<string, FieldValue>>({});
const formData = ref({
  manual_completion_notes: '',
  owner: null as null | string,
  status: 'required' as SRPMilestoneStatus,
  updated_dt: '',
});

const dialogTitle = computed(() => {
  if (!props.report || !props.milestone || !isPayloadMilestoneType(props.milestone.milestone_type)) {
    return 'ENISA Milestone Payload';
  }
  const eventLabel = props.report.reportable_event_type === 'EXPLOITS_KEV_APPROVED'
    ? 'AEV'
    : 'Severe Incident';
  return `Edit ${formatReportTypeValue()} ${eventLabel} report`;
});

const copiedAction = ref('');
let copyResetTimeout: ReturnType<typeof setTimeout> | undefined;

function markCopied(actionKey: string) {
  copiedAction.value = actionKey;
  if (copyResetTimeout) clearTimeout(copyResetTimeout);
  copyResetTimeout = setTimeout(() => {
    if (copiedAction.value === actionKey) copiedAction.value = '';
  }, 1600);
}

function isCopied(actionKey: string) {
  return copiedAction.value === actionKey;
}

function copyButtonClass(actionKey: string) {
  return isCopied(actionKey) ? 'btn-success copied' : 'btn-outline-secondary';
}

function formatReportTypeValue() {
  if (props.milestone?.milestone_type === '24h') return '24h';
  if (props.milestone?.milestone_type === '72h') return '72h';
  if (props.milestone?.milestone_type === 'final') return 'Final';
  return formatMilestoneTypeLabel(props.milestone?.milestone_type);
}

function formatStatusValue(status: SRPMilestoneStatus) {
  if (status === 'required') return 'Not Started';
  if (status === 'in_progress') return 'In Progress';
  if (status === 'in_review') return 'In Review';
  if (status === 'submitted') return 'Submitted';
  if (status === 'obsolete') return 'Obsolete';
  return status;
}

function selfAssign() {
  if (userStore.userEmail) {
    formData.value.owner = userStore.userEmail;
  }
}

function isRowEditable(row: SRPPayloadFieldRow) {
  return isPayloadRowEditable(row);
}

function shouldShowRequirement(row: SRPPayloadFieldRow) {
  return row.requirement !== 'copied_or_updated';
}

function formatFieldInputValue(row: SRPPayloadFieldRow): FieldValue {
  const value = row.value;
  if (row.input_type === 'multi-select') return parseFieldList(value);
  if (value === null || value === undefined || value === '[]') return '';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

function copyValueForRow(row: SRPPayloadFieldRow): string {
  if (isRowEditable(row)) {
    const value = fieldValues.value[row.key];
    return Array.isArray(value) ? value.join(', ') : value || '';
  }
  return formatPayloadValue(row.value);
}

function editableInputType(row: SRPPayloadFieldRow): string {
  if (row.input_type === 'datetime') return 'text';
  return 'text';
}

function parseFieldValue(row: SRPPayloadFieldRow): string | string[] {
  const value = fieldValues.value[row.key] || '';
  if (row.input_type === 'multi-select') {
    return parseFieldList(value);
  }
  return Array.isArray(value) ? value.join(', ') : value;
}

function selectAllFieldOptions(row: SRPPayloadFieldRow) {
  if (row.options) {
    fieldValues.value[row.key] = [...row.options];
  }
}

function buildAdditionalDetails() {
  const allowedKeys = new Set(rows.value.filter(row => isRowEditable(row)).map(row => row.key));
  const details: Record<string, string | string[]> = {};
  const existingDetails = props.milestone?.additional_details || {};

  for (const [key, value] of Object.entries(existingDetails)) {
    if (allowedKeys.has(key)) {
      details[key] = Array.isArray(value) ? value.filter(item => typeof item === 'string') : String(value ?? '');
    }
  }

  for (const row of rows.value) {
    if (isRowEditable(row)) {
      details[row.key] = parseFieldValue(row);
    }
  }

  return details;
}

function getCurrentPayload() {
  const payload: Record<string, string | string[]> = {};
  for (const row of rows.value) {
    payload[row.key] = isRowEditable(row) ? parseFieldValue(row) : copyValueForRow(row);
  }
  return payload;
}

async function copyText(text: string, actionKey: string) {
  if (!navigator.clipboard) return;
  await navigator.clipboard.writeText(text);
  markCopied(actionKey);
}

function copyHumanReadablePayload() {
  const text = rows.value
    .map(row => `${row.label}: ${copyValueForRow(row)}`)
    .join('\n');
  return copyText(text, 'text');
}

function handleSave() {
  if (!props.milestone) return;
  emit('save', {
    additional_details: buildAdditionalDetails(),
    manual_completion_notes: formData.value.manual_completion_notes,
    owner: formData.value.owner,
    status: formData.value.status,
    updated_dt: formData.value.updated_dt,
  });
  emit('close');
}

watch(
  () => [props.show, props.milestone, props.report] as const,
  () => {
    if (!props.show || !props.milestone || !props.report) return;
    formData.value = {
      manual_completion_notes: props.milestone.manual_completion_notes || '',
      owner: props.milestone.owner || null,
      status: props.milestone.status,
      updated_dt: props.milestone.updated_dt,
    };
    fieldValues.value = Object.fromEntries(
      rows.value
        .filter(row => isPayloadRowEditable(row))
        .map(row => [row.key, formatFieldInputValue(row)]),
    ) as Record<string, FieldValue>;
  },
  { immediate: true },
);
</script>

<template>
  <Modal class="modal-xl" :show="show" @close="emit('close')">
    <template #title>
      {{ dialogTitle }}
    </template>
    <template #body>
      <div v-if="!report || !milestone" class="text-muted">No milestone payload data available.</div>
      <div v-else-if="!isPayloadMilestoneType(milestone.milestone_type)" class="alert alert-info mb-0">
        <strong>{{ formatMilestoneTypeLabel(milestone.milestone_type) }}</strong>
        milestones do not have a generated ENISA 24h/72h/final payload template.
      </div>
      <div v-else>
        <div class="d-flex flex-wrap gap-2 mb-3">
          <span class="badge bg-dark">{{ formatEventTypeLabel(report.reportable_event_type) }}</span>
          <span class="badge bg-primary">{{ formatMilestoneTypeLabel(milestone.milestone_type) }}</span>
          <span class="badge bg-secondary">Status: {{ formatStatusValue(milestone.status) }}</span>
          <span v-if="milestone.payload_prepared_at" class="badge bg-success">
            Prepared: {{ formatDate(milestone.payload_prepared_at, true) }}
          </span>
          <span v-else class="badge bg-warning text-dark">Payload snapshot not prepared</span>
        </div>

        <div class="row g-2 mb-3">
          <div class="col-md-3">
            <label class="form-label">Report Type</label>
            <input
              :value="formatReportTypeValue()"
              type="text"
              class="form-control form-control-sm"
              disabled
            />
          </div>
          <div class="col-md-6">
            <label class="form-label">Owner</label>
            <div class="d-flex gap-2 align-items-start">
              <input
                v-model="formData.owner"
                type="email"
                class="form-control form-control-sm"
                placeholder="owner@example.com"
              />
              <button
                v-if="userStore.userEmail && formData.owner !== userStore.userEmail"
                type="button"
                class="btn btn-sm btn-primary text-nowrap"
                @click="selfAssign"
              >
                Self Assign
              </button>
            </div>
          </div>
          <div class="col-md-3">
            <label class="form-label">Status</label>
            <select v-model="formData.status" class="form-select form-select-sm">
              <option value="required">Not Started</option>
              <option value="in_progress">In Progress</option>
              <option value="submitted">Submitted</option>
              <option value="obsolete">Obsolete</option>
            </select>
          </div>
        </div>

        <hr class="my-3" />

        <div class="mb-3">
          <label class="form-label">Notes</label>
          <textarea
            v-model="formData.manual_completion_notes"
            class="form-control form-control-sm"
            rows="2"
          ></textarea>
        </div>

        <div v-if="missingRows.length" class="alert alert-warning">
          <div class="fw-bold mb-1">Missing required fields for this milestone</div>
          <ul class="mb-0 ps-3">
            <li v-for="row in missingRows" :key="row.key">{{ row.label }}</li>
          </ul>
        </div>

        <div class="table-responsive">
          <table class="table table-striped table-hover table-sm align-middle mb-0">
            <thead class="table-light">
              <tr>
                <th>Field</th>
                <th>Value</th>
                <th class="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in rows"
                :key="row.key"
                :class="{ 'table-warning': row.isMissing }"
              >
                <td class="payload-field-name fw-semibold">
                  <div>{{ row.label }}</div>
                  <small
                    v-if="shouldShowRequirement(row)"
                    class="badge requirement-badge mt-1"
                    :class="requirementBadgeClass(row.requirement)"
                  >
                    {{ formatRequirement(row.requirement) }}
                  </small>
                </td>
                <td>
                  <select
                    v-if="isRowEditable(row) && row.input_type === 'multi-select' && row.options"
                    v-model="fieldValues[row.key]"
                    class="form-select form-select-sm payload-edit-control"
                    multiple
                    size="7"
                  >
                    <option v-for="option in row.options" :key="option" :value="option">
                      {{ option }}
                    </option>
                  </select>
                  <button
                    v-if="isRowEditable(row) && row.input_type === 'multi-select' && row.options"
                    type="button"
                    class="btn btn-sm btn-primary mt-2"
                    @click="selectAllFieldOptions(row)"
                  >
                    Select All
                  </button>
                  <small
                    v-if="isRowEditable(row) && row.input_type === 'multi-select' && row.options"
                    class="d-block text-muted mt-1"
                  >
                    Hold Ctrl/Cmd to select multiple member states. Use EL for Greece.
                  </small>
                  <select
                    v-else-if="isRowEditable(row) && row.options"
                    v-model="fieldValues[row.key]"
                    class="form-select form-select-sm"
                  >
                    <option value=""></option>
                    <option v-for="option in row.options" :key="option" :value="option">
                      {{ option }}
                    </option>
                  </select>
                  <textarea
                    v-else-if="isRowEditable(row) && row.input_type === 'textarea'"
                    v-model="fieldValues[row.key]"
                    class="form-control form-control-sm payload-edit-control"
                    rows="2"
                  ></textarea>
                  <input
                    v-else-if="isRowEditable(row)"
                    v-model="fieldValues[row.key]"
                    :type="editableInputType(row)"
                    class="form-control form-control-sm"
                  />
                  <pre v-else class="payload-value mb-0">{{ formatPayloadValue(row.value) }}</pre>
                </td>
                <td class="text-end text-nowrap">
                  <button
                    type="button"
                    class="btn btn-sm copy-button"
                    :class="copyButtonClass(`field:${row.key}`)"
                    :disabled="row.isMissing"
                    @click="copyText(copyValueForRow(row), `field:${row.key}`)"
                  >
                    {{ isCopied(`field:${row.key}`) ? 'Copied' : 'Copy field' }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
    <template #footer>
      <button
        v-if="report && milestone && isPayloadMilestoneType(milestone.milestone_type)"
        type="button"
        class="btn copy-button"
        :class="copyButtonClass('json')"
        @click="copyText(payloadJson, 'json')"
      >
        {{ isCopied('json') ? 'Copied JSON' : 'Copy JSON' }}
      </button>
      <button
        v-if="report && milestone && isPayloadMilestoneType(milestone.milestone_type)"
        type="button"
        class="btn copy-button"
        :class="copyButtonClass('text')"
        @click="copyHumanReadablePayload"
      >
        {{ isCopied('text') ? 'Copied text' : 'Copy text' }}
      </button>
      <button
        v-if="report && milestone && isPayloadMilestoneType(milestone.milestone_type)"
        type="button"
        class="btn btn-primary"
        @click="handleSave"
      >
        Save changes
      </button>
      <button type="button" class="btn btn-secondary" @click="emit('close')">Close</button>
    </template>
  </Modal>
</template>

<style scoped>
.payload-field-name {
  min-width: 14rem;
}

.payload-value {
  background: transparent;
  max-height: 8rem;
  overflow: auto;
  white-space: pre-wrap;
}

.payload-edit-control {
  min-width: 16rem;
}

.requirement-badge {
  font-size: 0.65rem;
}

.copy-button {
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease;
}

.copy-button.copied {
  animation: copied-pulse 0.35s ease;
}

@keyframes copied-pulse {
  0% {
    transform: scale(1);
  }

  50% {
    transform: scale(1.04);
  }

  100% {
    transform: scale(1);
  }
}
</style>
