<script setup lang="ts">
import { computed, ref } from 'vue';
import { useModal } from '@/composables/useModal';
import LabelInput from './widgets/LabelInput.vue';
import Modal from '@/components/widgets/Modal.vue';
import LabelDiv from '@/components/widgets/LabelDiv.vue';

const props = defineProps<{
  modelValue: boolean;
  cveId: string | null | undefined;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', embargoed: boolean): void;
}>();

const { isModalOpen, openModal, closeModal } = useModal();
const confirmationId = ref('');
const isFlawIdConfirmed = computed(() => confirmationId.value === props.cveId);

function handleConfirm() {
  emit('update:modelValue', false);
  closeModal();
}
</script>

<template>
  <LabelDiv label="Embargoed">
    <template #default>
      <div>
        <div class="d-flex ms-0 p-0 justify-content-between">
          <div class="osim-embargo-label form-control">
            {{ modelValue ? 'Yes' : 'No' }}
          </div>
          <div v-if="modelValue">
            <button
              type="button"
              class="btn ms-3 btn-danger osim-unembargo-button"
              @click="openModal"
            >
              <i class="bi-radioactive ps-0"></i>
              <i class="bi-eye-fill"></i>
              <i class="bi-eye-slash-fill"></i>
              Unembargo
            </button>
            <Modal :show="isModalOpen" @close="closeModal">
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
                  {{ cveId }} if you wish to proceed.
                </div>
                <LabelInput v-model="confirmationId" label="Confirm" />
                <p v-if="confirmationId" class="alert alert-warning mt-2">
                  <i class="bi-exclamation-triangle-fill"></i> The embargo will only be removed when
                  the Flaw is saved.
                </p>
              </template>
              <template #footer>
                <button type="button" class="btn btn-info" @click="closeModal">Cancel</button>
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
  flex-grow: 1;
  width: inherit !important;
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
