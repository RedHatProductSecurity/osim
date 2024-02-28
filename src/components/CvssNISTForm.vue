<script setup lang="ts">
import { ref } from 'vue';
import Modal from '@/components/widgets/Modal.vue';

import LabelTextarea from '@/components/widgets/LabelTextarea.vue';
import { useUserStore } from '@/stores/UserStore';

const props = defineProps<{
  cveid?: string | null | undefined;
  flawSummary?: string
  bugzilla?: string
  nvdpage?: string | null | undefined;
  cvss?: string | null;
  nistcvss?: string | null;
}>();

const userStore = useUserStore();
const show = ref(false);
const modalShown = ref(false);

const toEmail = 'nvd@nist.gov';
const ccEmail = 'secalert@redhat.com';
const subject = `CVSS Rescore Request - ${props.cveid}`;
const emailBody = `Hello,

I have performed an analysis of ${props.cveid} on behalf of Red Hat Product Security, resulting in a Red Hat CVSS score which is different from the NIST score. Our information and analysis is included below, and we would appreciate your consideration and review.

CVE : ${props.cveid}

Red Hat Bugzilla: ${props.bugzilla}
NVD Page: https://nvd.nist.gov/vuln/detail/CVE-2024-0057
Red Hat CVSS: ${props.cvss}
NIST CVSS: ${props.nistcvss}

Flaw Summary: 
${props.flawSummary}

Red Hat's CVSS Justification:
____
`;

const EmailFooter = 
`Thank you.
-${userStore.userEmail}`;

function openMailto() {
  const recipient = encodeURI('nvd@nist.gov');
  const cc = encodeURI('secalert@redhat.com');
  const encodedSubject = encodeURIComponent(subject);
  const body = emailBody + '\n\n' + EmailFooter;
  const encodedBody = encodeURIComponent(body);
  const mailto = `mailto:${recipient}?cc=${cc}&subject=${encodedSubject}&body=${encodedBody}`;
  window.open(mailto, '_blank');
}

function openModal() {
  modalShown.value = true;
}
function closeModal() {
  modalShown.value = false;
}
</script>

<template>
  <div class="osim-cve-nist-button">
    <button type="button" class="btn btn-secondary" @click="openModal">
      Email NIST
    </button>

    <Modal width="800px" :show="modalShown" @close="closeModal">
      <template #title>
        Email NIST
      </template>
      <template #body>
        <div class="osim-input mb-3 border-start ps-3">
          <p><span class="fw-bold">To:</span> <span class="to-email">{{ toEmail }}</span></p>
          <p class="from-email"><span class="fw-bold">From:</span> {{ userStore.userEmail }}</p>
          <p><span class="fw-bold">CC:</span> <span class="cc-email">{{ ccEmail }}</span></p>
          <hr />
          <p>subject:</p>
          <div class="w-100 mb-2">
            <input class="form-control" :readonly="true" type="text" :value="subject" />
          </div>
          <hr />
        </div>

        <LabelTextarea label="Body:" v-model="emailBody" />
        <LabelTextarea label="Body" v-model="EmailFooter" :hideLabel=true />
      </template>
      <template #footer>
        <button type="button" class="btn btn-secondary cancel-btn" data-bs-dismiss="modal" @click="closeModal">Cancel
        </button>
        <button type="button" @click.prevent="openMailto" class="btn btn-primary send-email">Send Email</button>
      </template>
    </Modal>
  </div>
</template>

<style scoped>
.osim-cve-nist-button :deep(.modal-dialog) {
  max-width: 800px;
}
</style>
