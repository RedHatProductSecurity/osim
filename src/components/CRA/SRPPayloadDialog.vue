<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import {
  buildPayloadRows,
  formatMilestoneTypeLabel,
  formatPayloadValue,
  formatRequirement,
  isEmptyPayloadValue,
  isPayloadMilestoneType,
  isPayloadRowEditable,
  parseFieldList,
  requirementBadgeClass,
  type SRPPayloadFieldRow,
} from '@/components/CRA/srpPayloadFields';
import EUStatesSelector from '@/components/CRA/EUStatesSelector.vue';

import { useUserStore } from '@/stores/UserStore';
import type { SRPMilestoneStatus, SRPReport, SRPReportMilestone } from '@/types/cra';
import EditableDate from '@/widgets/EditableDate/EditableDate.vue';
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

type FieldValue = string | string[] | undefined;
type DetailValue = string | string[];

const payloadJson = computed(() => {
  if (!props.report || !props.milestone) return '{}';
  return JSON.stringify(getCurrentPayload(), null, 2);
});

const fieldValues = ref<Record<string, FieldValue>>({});
const formData = ref({
  manual_completion_notes: '',
  manual_due_at: '',
  mitigation_created_at: '',
  mitigation_link: '',
  owner: null as null | string,
  status: 'required' as SRPMilestoneStatus,
  updated_dt: '',
});
const initialTrackingFields = ref({
  manual_due_at: '',
  mitigation_created_at: '',
  mitigation_link: '',
});
const dueAtManuallyEdited = ref(false);

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

function fromISO8601Date(iso?: null | string): string {
  if (!iso) return '';
  return iso.substring(0, 10);
}

function toISO8601Date(dateString: string): string {
  if (!dateString) return '';
  return new Date(`${dateString}T00:00:00Z`).toISOString();
}

function addDays(dateString: string, days: number): string {
  const date = new Date(`${dateString}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().substring(0, 10);
}

const showAEVMitigationFields = computed(() =>
  props.report?.reportable_event_type === 'EXPLOITS_KEV_APPROVED'
  && (
    props.milestone?.milestone_type === '24h'
    || props.milestone?.milestone_type === '72h'
    || props.milestone?.milestone_type === 'final'
  ),
);

const showAEVFinalMitigationInheritanceHint = computed(() =>
  showAEVMitigationFields.value && props.milestone?.milestone_type === 'final',
);

function handleDueAtInput() {
  dueAtManuallyEdited.value = true;
}

function handleMitigationCreatedAtInput() {
  if (
    props.milestone?.milestone_type === 'final'
    && !dueAtManuallyEdited.value
  ) {
    formData.value.manual_due_at = formData.value.mitigation_created_at
      ? addDays(formData.value.mitigation_created_at, 14)
      : '';
  }
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
  return row.requirement !== 'not_applicable';
}

function formatFieldInputValue(row: SRPPayloadFieldRow): FieldValue {
  return normaliseEditableValue(row, row.value);
}

function copyValueForRow(row: SRPPayloadFieldRow): string {
  if (isRowEditable(row)) {
    const value = fieldValues.value[row.key];
    return Array.isArray(value) ? value.join(', ') : value || '';
  }
  return formatPayloadValue(row.value);
}

function parseFieldValue(row: SRPPayloadFieldRow): DetailValue {
  const value = fieldValues.value[row.key] ?? '';
  if (row.input_type === 'multi-select') {
    return parseFieldList(value);
  }
  return Array.isArray(value) ? value.join(', ') : value;
}

function normaliseEditableValue(row: SRPPayloadFieldRow, value: unknown): DetailValue {
  if (row.input_type === 'multi-select') return parseFieldList(value);
  if (value === null || value === undefined || value === '[]') return '';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

function normaliseExistingDetailValue(value: unknown): DetailValue {
  if (Array.isArray(value)) return value.filter(item => typeof item === 'string');
  return String(value ?? '');
}

function valuesEqual(left: DetailValue, right: DetailValue) {
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left)
      && Array.isArray(right)
      && left.length === right.length
      && left.every((value, index) => value === right[index]);
  }
  return left === right;
}

function currentPayloadValue(row: SRPPayloadFieldRow): unknown {
  return isRowEditable(row) ? parseFieldValue(row) : row.value;
}

function isRowMissing(row: SRPPayloadFieldRow) {
  const empty = isEmptyPayloadValue(currentPayloadValue(row));
  return (row.isMissing && empty) || (row.requirement === 'required' && empty);
}

const missingRows = computed(() => rows.value.filter(isRowMissing));

function dateFieldValue(key: string): string | undefined {
  const value = fieldValues.value[key];
  return Array.isArray(value) ? undefined : value || undefined;
}

function setDateFieldValue(key: string, value: string | undefined) {
  fieldValues.value[key] = value || '';
}

function multiSelectTextValue(key: string): string {
  const value = fieldValues.value[key];
  return Array.isArray(value) ? value.join('\n') : value || '';
}

function handleMultiSelectTextInput(key: string, event: Event) {
  const target = event.target as HTMLTextAreaElement;
  fieldValues.value[key] = target.value;
}

function buildAdditionalDetails() {
  const editableRows = rows.value.filter(row => isRowEditable(row));
  const allowedKeys = new Set(editableRows.map(row => row.key));
  const details: Record<string, DetailValue> = {};
  const existingDetails = props.milestone?.additional_details || {};

  for (const [key, value] of Object.entries(existingDetails)) {
    if (allowedKeys.has(key)) {
      details[key] = normaliseExistingDetailValue(value);
    }
  }

  for (const row of editableRows) {
    const currentValue = parseFieldValue(row);
    const initialValue = normaliseEditableValue(row, row.value);

    if (valuesEqual(currentValue, initialValue)) {
      if (row.source === 'manual_override') {
        details[row.key] = currentValue;
      } else {
        delete details[row.key];
      }
    } else {
      details[row.key] = currentValue;
    }
  }

  return details;
}

function getCurrentPayload() {
  const payload: Record<string, unknown> = {};
  for (const row of rows.value) {
    payload[row.key] = currentPayloadValue(row);
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
  const payload: Partial<SRPReportMilestone> = {
    additional_details: buildAdditionalDetails(),
    manual_completion_notes: formData.value.manual_completion_notes,
    owner: formData.value.owner,
    status: formData.value.status,
    updated_dt: formData.value.updated_dt,
  };

  if (formData.value.manual_due_at !== initialTrackingFields.value.manual_due_at) {
    payload.manual_due_at = formData.value.manual_due_at ? toISO8601Date(formData.value.manual_due_at) : null;
  }
  if (formData.value.mitigation_created_at !== initialTrackingFields.value.mitigation_created_at) {
    payload.mitigation_created_at = formData.value.mitigation_created_at
      ? toISO8601Date(formData.value.mitigation_created_at)
      : null;
  }
  if (formData.value.mitigation_link !== initialTrackingFields.value.mitigation_link) {
    payload.mitigation_link = formData.value.mitigation_link;
  }

  emit('save', payload);
  emit('close');
}

watch(
  () => [props.show, props.milestone, props.report] as const,
  () => {
    if (!props.show || !props.milestone || !props.report) return;
    dueAtManuallyEdited.value = false;
    formData.value = {
      manual_completion_notes: props.milestone.manual_completion_notes || '',
      manual_due_at: fromISO8601Date(props.milestone.manual_due_at || ''),
      mitigation_created_at: fromISO8601Date(props.milestone.mitigation_created_at),
      mitigation_link: props.milestone.mitigation_link || '',
      owner: props.milestone.owner || null,
      status: props.milestone.status,
      updated_dt: props.milestone.updated_dt,
    };
    initialTrackingFields.value = {
      manual_due_at: formData.value.manual_due_at,
      mitigation_created_at: formData.value.mitigation_created_at,
      mitigation_link: formData.value.mitigation_link,
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
  <Modal class="modal-xl modal-dialog-scrollable srp-payload-dialog" :show="show" @close="emit('close')">
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
          <div class="col-md-9">
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
        </div>

        <hr class="my-3" />

        <div v-if="missingRows.length" class="alert alert-warning">
          <div class="fw-bold mb-1">Missing required fields for this milestone</div>
          <ul class="mb-0 ps-3">
            <li v-for="row in missingRows" :key="row.key">{{ row.label }}</li>
          </ul>
        </div>

        <div class="table-responsive">
          <table class="table table-striped table-hover table-sm align-middle mb-0 payload-table">
            <colgroup>
              <col class="payload-field-column" />
              <col class="payload-value-column" />
              <col class="payload-actions-column" />
            </colgroup>
            <thead class="table-light">
              <tr>
                <th>Field</th>
                <th>Value</th>
                <th class="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              <template v-for="row in rows" :key="row.key">
                <tr
                  :class="{ 'table-warning': isRowMissing(row) }"
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
                  <td class="payload-value-cell">
                    <EUStatesSelector
                      v-if="isRowEditable(row) && row.input_type === 'multi-select' && row.options"
                      :modelValue="parseFieldList(fieldValues[row.key])"
                      :options="row.options"
                      @update:modelValue="fieldValues[row.key] = $event"
                    />
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
                      v-else-if="isRowEditable(row) && row.input_type === 'multi-select'"
                      :value="multiSelectTextValue(row.key)"
                      class="form-control form-control-sm payload-edit-control"
                      rows="2"
                      placeholder="Enter one value per line"
                      @input="handleMultiSelectTextInput(row.key, $event)"
                    ></textarea>
                    <textarea
                      v-else-if="isRowEditable(row) && row.input_type === 'textarea'"
                      v-model="fieldValues[row.key]"
                      class="form-control form-control-sm payload-edit-control"
                      rows="2"
                    ></textarea>
                    <EditableDate
                      v-else-if="isRowEditable(row) && row.input_type === 'datetime'"
                      :modelValue="dateFieldValue(row.key)"
                      :includesTime="true"
                      :editing="true"
                      class="payload-date-control"
                      @update:modelValue="setDateFieldValue(row.key, $event)"
                    />
                    <input
                      v-else-if="isRowEditable(row)"
                      v-model="fieldValues[row.key]"
                      type="text"
                      class="form-control form-control-sm"
                    />
                    <pre v-else class="payload-value mb-0">{{ formatPayloadValue(row.value) }}</pre>
                  </td>
                  <td class="text-end text-nowrap">
                    <button
                      type="button"
                      class="btn btn-sm copy-button"
                      :class="copyButtonClass(`field:${row.key}`)"
                      :disabled="isRowMissing(row)"
                      @click="copyText(copyValueForRow(row), `field:${row.key}`)"
                    >
                      {{ isCopied(`field:${row.key}`) ? 'Copied' : 'Copy field' }}
                    </button>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>

        <hr class="my-3" />

        <div class="milestone-tracking-section">
          <div v-if="showAEVMitigationFields" class="row g-2 align-items-end mb-3 mitigation-tracking-fields">
            <div class="col-md-4">
              <label class="form-label">Mitigation Created Date</label>
              <small v-if="showAEVFinalMitigationInheritanceHint" class="text-muted d-block mb-1">
                Inherited from the 72h report
              </small>
              <input
                v-model="formData.mitigation_created_at"
                type="date"
                class="form-control form-control-sm"
                @input="handleMitigationCreatedAtInput"
              />
            </div>
            <div class="col-md-8">
              <label class="form-label">Mitigation Link</label>
              <small v-if="showAEVFinalMitigationInheritanceHint" class="text-muted d-block mb-1">
                Inherited from the 72h report
              </small>
              <input
                v-model="formData.mitigation_link"
                type="url"
                class="form-control form-control-sm"
                placeholder="https://..."
              />
            </div>
          </div>

          <div class="row g-2 mb-3">
            <div class="col-md-3">
              <label class="form-label">Due Date</label>
              <input
                v-model="formData.manual_due_at"
                type="date"
                class="form-control form-control-sm"
                @input="handleDueAtInput"
              />
            </div>
            <div class="col-md-3">
              <label class="form-label">Status</label>
              <select v-model="formData.status" class="form-select form-select-sm">
                <option value="required">Not Started</option>
                <option value="in_progress">In Progress</option>
                <option value="in_review">In Review</option>
                <option value="submitted">Submitted</option>
                <option value="obsolete">Obsolete</option>
              </select>
            </div>
          </div>

          <div class="mb-3">
            <label class="form-label">Notes</label>
            <textarea
              v-model="formData.manual_completion_notes"
              class="form-control form-control-sm"
              rows="2"
            ></textarea>
          </div>
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
.payload-table {
  table-layout: fixed;
  min-width: 52rem;
}

.payload-field-column {
  width: clamp(12rem, 28%, 18rem);
}

.payload-actions-column {
  width: 9.5rem;
}

.payload-field-name {
  overflow-wrap: anywhere;
  white-space: normal;
}

.payload-value-cell :is(.form-control, .form-select) {
  width: 100%;
}

.payload-value {
  background: transparent;
  max-height: 8rem;
  overflow: auto;
  white-space: pre-wrap;
}

.payload-edit-control {
  min-width: 0;
}

.payload-date-control {
  width: 100%;
  max-width: 100%;
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

<style>
.srp-payload-dialog {
  height: calc(100vh - 3.5rem);
  max-height: calc(100vh - 3.5rem);
}

.srp-payload-dialog .modal-content {
  height: 100%;
  max-height: 100%;
  overflow: hidden;
}

.srp-payload-dialog .modal-body {
  min-height: 0;
  overflow-y: auto;
}

.srp-payload-dialog .modal-header,
.srp-payload-dialog .modal-footer {
  flex-shrink: 0;
}

.srp-payload-dialog .payload-date-control {
  width: 100%;
  max-width: 100%;
}

.srp-payload-dialog .modal-dialog {
  max-width: 1400px !important;
  width: 90vw !important;
}

.srp-payload-dialog textarea {
  resize: vertical;
  min-height: 80px;
}
</style>
