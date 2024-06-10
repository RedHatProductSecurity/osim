<script setup lang="ts">
import { computed } from 'vue';
import Modal from '@/components/widgets/Modal.vue';

import LabelTextarea from '@/components/widgets/LabelTextarea.vue';
import { useUserStore } from '@/stores/UserStore';
import { useModal } from '@/composables/useModal';

const props = defineProps<{
  cveid?: string | null;
  summary?: string | null;
  bugzilla?: string;
  cvss?: string;
  nistcvss?: string;
}>();

const userStore = useUserStore();
const { isModalOpen, openModal, closeModal } = useModal();

const toEmail = 'nvd@nist.gov';
const ccEmail = 'secalert@redhat.com';
const subject = computed(() => `CVSS Rescore Request - ${props.cveid}`);
const emailBody = computed(() => `Hello,

I have performed an analysis of ${props.cveid} on behalf of Red Hat Product Security,
resulting in a Red Hat CVSS score which is different from the NIST score.
Our information and analysis is included below,
and we would appreciate your consideration and review.

CVE : ${props.cveid}

Red Hat Bugzilla: ${props.bugzilla}
NVD Page: https://nvd.nist.gov/vuln/detail/${props.cveid}
Red Hat CVSS: ${props.cvss}
NIST CVSS: ${props.nistcvss}

Flaw Summary: 
${props.summary}

Red Hat's CVSS Justification:
____

Thank you,
-${userStore.userEmail}
`);

function openMailto() {
  const recipient = encodeURI(toEmail);
  const cc = encodeURI(ccEmail);
  const encodedSubject = encodeURIComponent(subject.value);
  const encodedBody = encodeURIComponent(emailBody.value);
  const mailto = `mailto:${recipient}?cc=${cc}&subject=${encodedSubject}&body=${encodedBody}`;
  window.open(mailto, '_blank');
}
</script>

<template>
  <div class="osim-cve-nist-button">
    <button type="button" class="btn btn-secondary" @click="openModal">
      Email NIST
    </button>

    <Modal :show="isModalOpen" @close="closeModal">
      <template #title>
        Email NIST
      </template>
      <template #body>
        <div class="osim-input mb-3 border-start ps-3">
          <p><span class="fw-bold">To:</span> <span class="to-email">{{ toEmail }}</span></p>
          <p class="from-email"><span class="fw-bold">From:</span> {{ userStore.userEmail }}</p>
          <p><span class="fw-bold">CC:</span> <span class="cc-email">{{ ccEmail }}</span></p>
          <hr />
          <p>Subject:</p>
          <div class="mb-2">
            <input
              class="form-control"
              :readonly="true"
              type="text"
              :value="subject"
            />
          </div>
          <hr />
        </div>

        <LabelTextarea v-model="emailBody" label="Body:" />
      </template>
      <template #footer>
        <button
          type="button"
          class="btn btn-secondary cancel-btn"
          data-bs-dismiss="modal"
          @click="closeModal"
        >Cancel
        </button>
        <button type="button" class="btn btn-primary send-email" @click.prevent="openMailto">
          Send Email
        </button>
      </template>
    </Modal>
  </div>
</template>

<style scoped>
.osim-cve-nist-button :deep(.modal-dialog) {
  max-width: 80ch;
}
</style>
