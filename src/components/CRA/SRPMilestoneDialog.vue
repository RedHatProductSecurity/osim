<script setup lang="ts">
import { ref, watch, computed } from 'vue';

import Modal from '@/widgets/Modal/Modal.vue';
import type {
  SRPEventType,
  SRPFieldSpec,
  SRPMilestoneStatus,
  SRPMilestoneType,
  SRPReportMilestone,
} from '@/types/cra';
import { SRP_FIELDS } from '@/constants/cra';
import { useUserStore } from '@/stores/UserStore';

const props = defineProps<{
  eventType?: null | SRPEventType;
  milestone?: SRPReportMilestone;
  show: boolean;
}>();

const emit = defineEmits<{
  close: [];
  save: [milestone: Partial<SRPReportMilestone>];
}>();

const userStore = useUserStore();

// ── SRP field spec ───────────────────────────────────────────────────────────
// SRPFieldSpec, SRPFieldRequirement, SRPFieldType → @/types/cra
// SRP_FIELDS → @/constants/cra

function eventTypeToScope(et: null | SRPEventType | undefined): 'aev' | 'si' | null {
  if (et === 'EXPLOITS_KEV_APPROVED') return 'aev';
  if (et === 'MAJOR_INCIDENT_APPROVED') return 'si';
  return null;
}

// ── Form state ───────────────────────────────────────────────────────────────

// Keys whose original values were arrays; used to restore type on save.
const originalArrayKeys = ref<Set<string>>(new Set());

const formData = ref({
  additional_details: {} as Record<string, string>,
  due_at: '',
  manual_completion_notes: '',
  milestone_type: 'additional_information_response',
  owner: null as null | string,
  request_received_at: '',
  request_source: '',
  request_text: '',
  status: 'required',
  updated_dt: '',
});

function toISO8601Date(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString + 'T00:00:00Z');
  return date.toISOString();
}

function fromISO8601Date(iso: null | string): string {
  if (!iso) return '';
  return iso.substring(0, 10);
}

// datetime-local helpers: preserve the full timestamp (seconds precision).
const DATETIME_LOCAL_KEYS = new Set(['aev_detected_at', 'incident_detected_at', 'incident_occurred_at']);

function toISO8601DateTime(local: string): string {
  if (!local) return '';
  // datetime-local value is "YYYY-MM-DDTHH:mm" — append seconds + Z for UTC ISO
  return new Date(local + ':00Z').toISOString();
}

function fromISO8601DateTime(iso: null | string): string {
  if (!iso) return '';
  // Slice to "YYYY-MM-DDTHH:mm" (drop seconds and timezone suffix)
  return iso.substring(0, 16);
}

function selfAssign() {
  if (userStore.userEmail) {
    formData.value.owner = userStore.userEmail;
  }
}

const isAssignedToMe = computed(() =>
  formData.value.owner === userStore.userEmail && userStore.userEmail !== '',
);

// ── Visible fields ───────────────────────────────────────────────────────────

const milestoneType = computed((): SRPMilestoneType =>
  (props.milestone?.milestone_type || formData.value.milestone_type) as SRPMilestoneType,
);

// Resolved column for requirement lookups; null for milestone types with no column.
const milestoneCol = computed((): '24h' | '72h' | 'final' | null => {
  const t = milestoneType.value;
  if (t === '24h' || t === '72h' || t === 'final') return t;
  return null;
});

const scope = computed(() => eventTypeToScope(props.eventType));

const visibleFields = computed(() => {
  const col = milestoneCol.value;
  if (!col) return []; // additional_information_response: hide all SRP fields
  return SRP_FIELDS.filter((f) => {
    if (f.scope !== 'common') {
      if (scope.value === null) return false; // unknown event type: hide scoped fields
      if (f.scope !== scope.value) return false;
    }
    return f[col] !== 'na';
  });
});

function requirementLabel(field: SRPFieldSpec): string {
  const col = milestoneCol.value;
  if (!col) return '';
  const req = field[col];
  if (req === 'required') return 'Required';
  if (req === 'required_if_available') return 'Required if available';
  if (req === 'optional') return 'Optional';
  return '';
}

function requirementClass(field: SRPFieldSpec): string {
  const col = milestoneCol.value;
  if (!col) return '';
  const req = field[col];
  if (req === 'required') return 'text-danger';
  if (req === 'required_if_available') return 'text-warning';
  return 'text-muted';
}

// ── Lifecycle ────────────────────────────────────────────────────────────────

watch(() => props.show, (newShow) => {
  if (newShow) {
    const existing = props.milestone?.additional_details || {};
    // Convert all values to strings for the form inputs; track original arrays
    // so handleSave can restore them if the user didn't change the value.
    const details: Record<string, string> = {};
    originalArrayKeys.value = new Set();
    validationErrors.value = new Set();
    for (const [k, v] of Object.entries(existing)) {
      if (Array.isArray(v)) {
        originalArrayKeys.value.add(k);
        details[k] = v.join(', ');
      } else if (DATETIME_LOCAL_KEYS.has(k)) {
        details[k] = fromISO8601DateTime(v as null | string);
      } else {
        details[k] = String(v ?? '');
      }
    }
    formData.value = {
      additional_details: details,
      due_at: fromISO8601Date(props.milestone?.due_at || ''),
      manual_completion_notes: props.milestone?.manual_completion_notes || '',
      milestone_type: props.milestone?.milestone_type || 'additional_information_response',
      owner: props.milestone?.owner || null,
      request_received_at: fromISO8601Date(props.milestone?.request_received_at || ''),
      request_source: props.milestone?.request_source || '',
      request_text: props.milestone?.request_text || '',
      status: props.milestone?.status || 'required',
      updated_dt: props.milestone?.updated_dt || '',
    };
  }
});

// ── Validation ───────────────────────────────────────────────────────────────

const validationErrors = ref<Set<string>>(new Set());

function isFieldEmpty(key: string): boolean {
  const v = formData.value.additional_details[key];
  return v === undefined || v === null || String(v).trim() === '';
}

function validate(): boolean {
  const errors = new Set<string>();

  if (!props.milestone) {
    if (!formData.value.request_received_at) errors.add('request_received_at');
    if (!formData.value.request_source?.trim()) errors.add('request_source');
    if (!formData.value.request_text?.trim()) errors.add('request_text');
  }

  const col = milestoneCol.value;
  if (col) {
    for (const field of visibleFields.value) {
      if (field[col] === 'required' && isFieldEmpty(field.key)) {
        errors.add(field.key);
      }
    }
  }

  validationErrors.value = errors;
  return errors.size === 0;
}

// ── Save ─────────────────────────────────────────────────────────────────────

function handleSave() {
  if (!validate()) return;

  // Build additional_details from structured fields (omit empty values).
  // List fields (isList or originally arrived as arrays) are saved as string[].
  // If the joined string is unchanged from the original, restore the original array.
  const listKeys = new Set(SRP_FIELDS.filter(f => f.isList).map(f => f.key));
  const additionalDetailsObj: Record<string, any> = {};
  const originalDetails = props.milestone?.additional_details || {};
  for (const [k, v] of Object.entries(formData.value.additional_details)) {
    if (v === null || v === undefined || String(v).trim() === '') continue;
    if (listKeys.has(k) || originalArrayKeys.value.has(k)) {
      const originalArr = originalDetails[k] as string[] | undefined;
      const originalJoined = originalArr ? originalArr.join(', ') : null;
      if (originalJoined !== null && v === originalJoined) {
        // Unmodified — restore original array
        additionalDetailsObj[k] = originalArr;
      } else {
        // New value or edited — split by comma
        additionalDetailsObj[k] = v.split(',').map((s: string) => s.trim()).filter(Boolean);
      }
    } else if (DATETIME_LOCAL_KEYS.has(k)) {
      additionalDetailsObj[k] = toISO8601DateTime(v);
    } else {
      additionalDetailsObj[k] = v;
    }
  }

  const payload: Partial<SRPReportMilestone> = {
    manual_completion_notes: formData.value.manual_completion_notes,
    owner: formData.value.owner,
    request_source: formData.value.request_source,
    request_text: formData.value.request_text,
    status: formData.value.status as SRPMilestoneStatus,
  };

  const hasDetails = Object.keys(additionalDetailsObj).length > 0;
  const hadDetails = props.milestone?.additional_details && Object.keys(props.milestone.additional_details).length > 0;
  if (hasDetails || hadDetails) {
    payload.additional_details = additionalDetailsObj;
  }

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
          :class="{ 'is-invalid': validationErrors.has('request_received_at') }"
          :required="!milestone"
        />
        <div v-if="validationErrors.has('request_received_at')" class="invalid-feedback">Required</div>
        <small v-else class="text-muted">When the additional information request was received</small>
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
          :class="{ 'is-invalid': validationErrors.has('request_source') }"
          placeholder="e.g., ENISA Portal"
          :required="!milestone"
        />
        <div v-if="validationErrors.has('request_source')" class="invalid-feedback">Required</div>
        <small v-else class="text-muted">Where the request came from</small>
      </div>

      <div class="mb-3">
        <label class="form-label">
          Request Text
          <span v-if="!milestone" class="text-danger">*</span>
        </label>
        <textarea
          v-model="formData.request_text"
          class="form-control"
          :class="{ 'is-invalid': validationErrors.has('request_text') }"
          :rows="milestone ? 3 : 4"
          placeholder="Enter the details of what information was requested..."
          :required="!milestone"
        ></textarea>
        <div v-if="validationErrors.has('request_text')" class="invalid-feedback">Required</div>
        <small v-else class="text-muted">Description of the additional information requested</small>
      </div>

      <hr class="my-3" />

      <!-- Additional Details: structured SRP fields (only for typed milestones) -->
      <div v-if="milestone && milestoneCol">
        <h6 class="mb-3">Additional Details</h6>
        <div
          v-for="field in visibleFields"
          :key="field.key"
          class="mb-3"
        >
          <label class="form-label d-flex justify-content-between align-items-baseline">
            <span>{{ field.label }}</span>
            <small :class="requirementClass(field)">{{ requirementLabel(field) }}</small>
          </label>
          <textarea
            v-if="field.type === 'textarea'"
            v-model="formData.additional_details[field.key]"
            class="form-control"
            :class="{ 'is-invalid': validationErrors.has(field.key) }"
            rows="2"
          ></textarea>
          <input
            v-else
            v-model="formData.additional_details[field.key]"
            :type="field.type"
            class="form-control"
            :class="{ 'is-invalid': validationErrors.has(field.key) }"
          />
          <div v-if="validationErrors.has(field.key)" class="invalid-feedback">Required</div>
        </div>
      </div>

      <hr class="my-3" />

      <div class="mb-3">
        <label class="form-label">Status</label>
        <select v-model="formData.status" class="form-select">
          <option value="required">Required</option>
          <option value="in_progress">In Progress</option>
          <option value="in_review">In Review</option>
          <option value="submitted">Submitted</option>
          <option value="obsolete">Obsolete</option>
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
