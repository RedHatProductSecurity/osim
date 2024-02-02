<script setup lang="ts">
import {computed, ref} from 'vue';
import { useField } from 'vee-validate';
import { useModal } from '@/composables/useModal';
import LabelInput from './widgets/LabelInput.vue';
import LabelStatic from './widgets/LabelStatic.vue';
import Modal from '@/components/widgets/Modal.vue';

const props = defineProps<{
  cveId: string;
}>();

const { isModalOpen, openModal, closeModal } = useModal();
const { value: isEmbargoed } = useField<boolean>('embargoed');
const confirmationId = ref('');
const isFlawIdConfirmed = computed(() => confirmationId.value === props.cveId);

function handleConfirm(){
  isEmbargoed.value = false;
  closeModal();
}
</script>

<template>
  <LabelStatic label="Embargoed" :modelValue="isEmbargoed ? 'Yes' : 'No'">
      <div v-if="isEmbargoed" class="mt-2">
        <button type="button" class="btn btn-danger osim-unembargo-button" @click="openModal">
          <i class="bi-radioactive ps-0"></i>
          <i class="bi-eye-fill"></i>
          <i class="bi-eye-slash-fill"></i>
  
          Unembargo
  
        </button>
        <Modal :show="isModalOpen" @close="closeModal">
          <template #header>
            Set Flaw for Unembargo
          </template>
          <template #body>
            <p style="color: #f00;">
              Making a flaw public is an irreversible action! Here is why:
            </p>
            <ol>
              <li>
                Email notifications are sent to Bugzilla watchers about the
                unembargo, including Bugzilla users outside of Red Hat,
              </li>
              <li>
                A request to push the flaw's description and other metadata is
                sent to MITRE,
              </li>
              <li>
                A public CVE page is generated and published on the Customer
                Portal,
              </li>
              <li>
                Search engines may index or cache the created CVE page or
                Bugzilla bug.
              </li>
            </ol>
            <LabelInput
                label="To prevent an accidental unembargo please confirm your intention by typing the numeric flaw ID if you wish to proceed."
                v-model="confirmationId"/>
          </template>
          <template #footer>
            <button type="button" class="btn btn-info" @click="closeModal">Cancel</button>
            <button type="button" class="btn btn-primary" :disabled="!isFlawIdConfirmed" @click="handleConfirm">
              Confirm
            </button>
          </template>
        </Modal>
      </div>

  </LabelStatic>
</template>

<style lang="scss" scoped>
i {
  color: var(--redhat-primary);
}

button {
  &:disabled {
    opacity: 0.25;
  }

  i {
    color: #fff;
  }

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

input[type='checkbox'].form-check-input {
  background-color: var(--redhat-primary);
  border-color: var(--redhat-primary);
  pointer-events: none;
}
</style>
