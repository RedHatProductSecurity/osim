<script setup lang="ts">
import { watch } from 'vue';

import { useModal } from '@/composables/useModal';

import Modal from '@/widgets/Modal/Modal.vue';

const props = defineProps<{
  showModal: boolean;
}>();

const emit = defineEmits<{
  confirmOperation: [];
  hideModal: [];
}>();

const {
  closeModal,
  isModalOpen: isLowSeverityWarning,
  openModal,
} = useModal();

watch(() => props.showModal, () => {
  if (props.showModal) {
    openModal();
    return;
  }
  isLowSeverityWarning.value = false;
});

function cancelOperation() {
  closeModal();
  emit('hideModal');
}

function confirmOperation() {
  closeModal();
  emit('confirmOperation');
}
</script>

<template>
  <Modal :show="isLowSeverityWarning" style="max-width: 50%; margin-top: 6ch;" @close="cancelOperation()">
    <template #body>
      <div class="alert alert-warning p-2 mb-0">
        <h1 class="modal-title fs-5 mb-2">
          <div class="badge text-bg-warning mx-1 fs-6">
            <i class="bi bi-exclamation-triangle-fill" />
            Warning
          </div>
          Filing Low Severity Trackers
        </h1>
        <button
          type="button"
          class="btn-close"
          aria-label="Close"
          @click="cancelOperation()"
        />
        <div class="ms-2">
          <p>It is the policy of Red Hat to not file trackers and require fixes for low impact CVEs.<br>
            There may be some cases when we still want to have trackers but this is not common practice.</p>
          <p>Confirm action to proceed filing trackers or cancel to go back to the tracker manager</p>
        </div>
        <div class="ms-1 d-flex gap-2">
          <button
            type="button"
            class="btn btn-secondary"
            data-bs-dismiss="modal"
            @click="cancelOperation()"
          >Cancel</button>
          <button
            type="button"
            class="btn btn-primary"
            @click="confirmOperation()"
          >
            Confirm
          </button>
        </div>
      </div>
    </template>
  </Modal>
</template>

<style lang="scss" scoped>
:deep(.modal-body) {
  padding: 0;
}
</style>
