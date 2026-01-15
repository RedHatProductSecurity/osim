<script setup lang="ts">
import { ref, watch } from 'vue';

import { useModal } from '@/composables/useModal';

import { postIncidentRequest } from '@/services/FlawService';
import { IncidentKindEnum, IncidentKindEnumLabels, ZodIncidentRequestSchema } from '@/types/zodFlaw';
import { useToastStore } from '@/stores/ToastStore';
import { getDisplayedOsidbError } from '@/services/osidb-errors-helpers';
import Modal from '@/widgets/Modal/Modal.vue';
import LabelTextarea from '@/widgets/LabelTextarea/LabelTextarea.vue';
import LabelSelect from '@/widgets/LabelSelect/LabelSelect.vue';

const props = defineProps<{
  flawId: string;
  showModal: boolean;
}>();

const emit = defineEmits<{
  hideModal: [];
  requestSubmitted: [];
}>();

const { closeModal, isModalOpen, openModal } = useModal();

const incidentReason = ref<string | undefined>('');
const incidentKind = ref<string | undefined>(IncidentKindEnum.MAJOR_INCIDENT_REQUESTED);
const isSubmitting = ref(false);
const validationError = ref('');
const submissionError = ref('');

const { addToast } = useToastStore();

// Options for the incident kind dropdown (swap keys/values from labels)
const incidentKindOptions = Object.fromEntries(
  Object.entries(IncidentKindEnumLabels).map(([k, v]) => [v, k]),
);

watch(() => props.showModal, () => {
  if (props.showModal) {
    openModal();
    resetForm();
  } else {
    isModalOpen.value = false;
  }
});

function resetForm() {
  incidentReason.value = '';
  incidentKind.value = IncidentKindEnum.MAJOR_INCIDENT_REQUESTED;
  validationError.value = '';
  submissionError.value = '';
}

function cancelOperation() {
  closeModal();
  emit('hideModal');
}

async function submitRequest() {
  validationError.value = '';
  submissionError.value = '';

  // Validate the form
  const validation = ZodIncidentRequestSchema.safeParse({
    comment: incidentReason.value,
    kind: incidentKind.value,
  });

  if (!validation.success) {
    validationError.value = validation.error.errors[0].message;
    return;
  }

  isSubmitting.value = true;

  try {
    // Use validated data
    await postIncidentRequest(props.flawId, validation.data);

    // Show success toast notification
    addToast({
      title: 'Incident Request Submitted',
      body: 'Your incident request has been submitted successfully.',
      css: 'success',
    });

    closeModal();
    emit('requestSubmitted');
    emit('hideModal');
  } catch (error) {
    // Display error in the dialog instead of toast
    submissionError.value = getDisplayedOsidbError(error);
    console.error('Error submitting incident request:', error);
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <Modal :show="isModalOpen" style="max-width: 600px;" @close="cancelOperation">
    <template #title>
      Request Incident
    </template>
    <template #body>
      <div class="incident-request-form" style="min-height: 200px;">
        <LabelSelect
          v-model="incidentKind"
          label="Type of Incident"
          :options="incidentKindOptions"
          :error="null"
          class="mb-3"
        />

        <LabelTextarea
          v-model="incidentReason"
          label="Incident Reason"
          placeholder="Provide the reason for requesting this incident..."
          :error="null"
          rows="5"
          class="mb-3"
        />

        <div v-if="validationError" class="alert alert-danger" role="alert">
          {{ validationError }}
        </div>

        <div v-if="submissionError" class="alert alert-danger" role="alert">
          <strong>Error submitting request:</strong> {{ submissionError }}
        </div>
      </div>
    </template>
    <template #footer>
      <button
        type="button"
        class="btn btn-secondary"
        :disabled="isSubmitting"
        @click="cancelOperation"
      >
        Cancel
      </button>
      <button
        type="button"
        class="btn btn-primary"
        :disabled="isSubmitting"
        @click="submitRequest"
      >
        {{ isSubmitting ? 'Submitting...' : 'Submit' }}
      </button>
    </template>
  </Modal>
</template>

<style scoped>
/* Select: label aligned with dropdown */
.incident-request-form :deep(label:has(select) .row) {
  display: flex;
  align-items: stretch;
}

.incident-request-form :deep(label:has(select) .form-label) {
  display: flex;
  align-items: center;
  white-space: nowrap;
  width: auto;
  flex: 0 0 auto;
  height: 38px; /* matches Bootstrap form-control height */
  padding-right: var(--bs-spacer, 0.5rem);
  border-radius: var(--bs-border-radius) 0 0 var(--bs-border-radius);
}

.incident-request-form :deep(label:has(select) .col-9) {
  flex: 1;
  width: auto;
  padding-left: 0;
}

.incident-request-form :deep(label:has(select) select) {
  border-radius: 0 var(--bs-border-radius) var(--bs-border-radius) 0;
}

/* Textarea: tab-style label on top-left */
.incident-request-form :deep(label:has(textarea) .form-label) {
  width: auto !important;
  max-width: fit-content !important;
  text-align: center;
  justify-content: center;
  padding-inline: 2rem !important;
  border-radius: var(--bs-border-radius) var(--bs-border-radius) 0 0;
}

.incident-request-form :deep(label:has(textarea) textarea) {
  border-top-left-radius: 0;
}
</style>
