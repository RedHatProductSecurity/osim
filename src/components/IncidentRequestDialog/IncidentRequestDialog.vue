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
  showModal: boolean;
  flawId: string;
}>();

const emit = defineEmits<{
  hideModal: [];
  requestSubmitted: [];
}>();

const { closeModal, isModalOpen, openModal } = useModal();

const incidentReason = ref('');
const incidentKind = ref<IncidentKindEnum>(IncidentKindEnum.MAJOR_INCIDENT_REQUESTED);
const isSubmitting = ref(false);
const validationError = ref('');
const submissionError = ref('');

const { addToast } = useToastStore();

// Options for the incident kind dropdown
const incidentKindOptions = {
  [IncidentKindEnumLabels[IncidentKindEnum.MAJOR_INCIDENT_REQUESTED]]: IncidentKindEnum.MAJOR_INCIDENT_REQUESTED,
  [IncidentKindEnumLabels[IncidentKindEnum.MINOR_INCIDENT_REQUESTED]]: IncidentKindEnum.MINOR_INCIDENT_REQUESTED,
  [IncidentKindEnumLabels[IncidentKindEnum.EXPLOITS_KEV_REQUESTED]]: IncidentKindEnum.EXPLOITS_KEV_REQUESTED,
};

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
    await postIncidentRequest(props.flawId, {
      comment: incidentReason.value,
      kind: incidentKind.value,
    });
    
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
      <div class="incident-request-form">
        <LabelSelect
          v-model="incidentKind"
          label="Type of Incident"
          :options="incidentKindOptions"
          class="mb-3"
        />
        
        <LabelTextarea
          v-model="incidentReason"
          label="Incident Reason"
          placeholder="Provide the reason for requesting this incident..."
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
.incident-request-form {
  min-height: 200px;
}
</style>

