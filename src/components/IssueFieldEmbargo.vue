<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import Modal from '@/components/widgets/Modal.vue';
import LabelDiv from '@/components/widgets/LabelDiv.vue';
import LabelCheckbox from '@/components/widgets/LabelCheckbox.vue';

import { useModal } from '@/composables/useModal';

import LabelInput from './widgets/LabelInput.vue';

const props = defineProps<{
  flawId: null | string | undefined;
  isEmbargoed: boolean;
  isFlawNew: boolean;
}>();

const modelValue = defineModel<boolean | undefined>();
const showModal = defineModel<boolean | undefined>('showModal');

const emit = defineEmits<{
  (e: 'update:modelValue', embargoed: boolean): void;
  (e: 'update:showModal', value: boolean): void;
  (e: 'updateFlaw'): void;
}>();

const { closeModal, isModalOpen, openModal } = useModal();
const confirmationId = ref('');
const isFlawIdConfirmed = computed(() => confirmationId.value === props.flawId);

function handleConfirm() {
  emit('updateFlaw');
  handleCloseModal();
}

function handleCloseModal() {
  confirmationId.value = '';
  emit('update:showModal', false);
}

watch(() => showModal.value, () => {
  if (showModal.value) {
    openModal();
  } else {
    closeModal();
  }
});
</script>

<template>
  <LabelDiv label="Embargoed">
    <template #default>
      <div>
        <div class="d-flex ms-0 p-0 justify-content-between">
          <LabelCheckbox v-if="isFlawNew" v-model="modelValue" label="Embargoed?" />
          <div v-else class="osim-embargo-label osim-input d-flex align-items-center">
            <span
              class="form-control"
              :class="{
                'has-warning': isEmbargoed && !modelValue,
                'has-button': isEmbargoed
              }"
            >
              {{ modelValue ? 'Yes' : 'No' }}
              <i v-if="isEmbargoed && !modelValue" class="bi-exclamation-circle"></i>
            </span>
            <div
              v-if="isEmbargoed && !modelValue"
              class="warning-tooltip"
            >The flaw will be unembargoed on save.</div>
          </div>
          <div v-if="!isFlawNew && isEmbargoed">
            <button
              type="button"
              class="btn osim-field-button"
              :class="{
                'btn-danger osim-unembargo-button': modelValue,
                'btn-secondary': !modelValue,
              }"
              @click="modelValue = !modelValue;"
            >
              <i v-if="modelValue" class="bi-radioactive ps-0"></i>
              <i v-if="modelValue" class="bi-eye-fill"></i>
              <i v-if="modelValue" class="bi-eye-slash-fill"></i>
              <i v-if="!modelValue" class="bi-arrow-counterclockwise"></i>
              {{ modelValue ? 'Unembargo' : 'Reset' }}
            </button>
            <Modal :show="isModalOpen" @close="handleCloseModal">
              <template #header> Set Flaw for Unembargo </template>
              <template #body>
                <p class="text-danger">
                  Making a Flaw public is an irreversible action! Here is why:
                </p>
                <ol>
                  <li>
                    Email notifications are sent to Bugzilla watchers about the unembargo, including
                    Bugzilla users outside of Red Hat.
                  </li>
                  <li>
                    A request to push the Flaw's description and other metadata is sent to MITRE.
                  </li>
                  <li>A public CVE page is generated and published on the Customer Portal.</li>
                  <li>Search engines may index or cache the created CVE page or Bugzilla bug.</li>
                </ol>
                <div class="alert alert-info">
                  To prevent an accidental unembargo please confirm your intention by typing
                  {{ flawId }} if you wish to proceed.
                </div>
                <LabelInput v-model="confirmationId" label="Confirm" />
                <!-- <p v-if="confirmationId" class="alert alert-warning mt-2">
                  <i class="bi-exclamation-triangle-fill"></i> The embargo will only be removed when
                  the Flaw is saved.
                </p> -->
              </template>
              <template #footer>
                <button type="button" class="btn btn-info" @click="handleCloseModal">Cancel</button>
                <button
                  type="button"
                  class="btn btn-danger"
                  :disabled="!isFlawIdConfirmed"
                  @click="handleConfirm"
                >
                  Remove Embargo
                </button>
              </template>
            </Modal>
          </div>
        </div>
      </div>
    </template>
  </LabelDiv>
</template>

<style lang="scss" scoped>
.osim-embargo-label {
  position: relative;
  flex-grow: 1;
  width: inherit !important;

  .has-button {
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
  }

  .has-warning {
    background-color: #fff5d1;
    display: flex;
    border-color: #f5c000;

    .bi-exclamation-circle {
      display: inline !important;
      color: #f5c000;
      margin-left: auto;
    }
  }

  .warning-tooltip {
    display: none;
  }

  &:hover .warning-tooltip {
    position: absolute;
    display: block;
    top: 100%;
    margin-top: 0.1rem;
    padding: 0.25rem 0.5rem;
    z-index: 5;
    background-color: #f5c000;
    border-radius: 0.375rem;
    font-size: 0.875rem;
  }
}

button.osim-field-button {
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
  width: 138px;
  height: 38px;
}

button.osim-unembargo-button {
  i.bi-radioactive {
    display: inline;
  }

  i.bi-eye-slash-fill,
  i.bi-eye-fill {
    display: none;
  }

  &:hover {
    i.bi-radioactive {
      display: none;
    }

    i.bi-eye-slash-fill {
      animation: fade-in-out-eye-slash-fill 2s ease-in-out infinite;
      display: inline-block;
    }

    i.bi-eye-fill {
      animation: fade-in-out-eye-fill 2s ease-in-out infinite;
      display: inline-block;
    }
  }
}

@keyframes fade-in-out-eye-fill {
  0%,
  49% {
    visibility: hidden;
    opacity: 0;
    width: 0;
  }

  50% {
    visibility: visible;
    width: auto;
  }

  99% {
    visibility: visible;
    width: auto;
    opacity: 1;
  }
}

@keyframes fade-in-out-eye-slash-fill {
  1% {
    visibility: visible;
    width: auto;
    opacity: 1;
  }

  49% {
    visibility: visible;
    width: auto;
    opacity: 0;
  }

  50%,
  100% {
    opacity: 0;
    visibility: hidden;
    width: 0;
  }
}
</style>
