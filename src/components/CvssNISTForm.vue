<script setup lang="ts">

import { computed, ref, watch } from 'vue';
import LabelTextarea from '@/components/widgets/LabelTextarea.vue';
import { useUserStore } from '@/stores/UserStore';

const props = defineProps<{
  flaw?: any,
  cveid?: string | null | undefined;
  flawSummary?: string
  bugzilla?: string
  nvdpage?: string | null | undefined;
  cvss?: string | null | undefined;
  nistcvss?: string | null | undefined;
  cvssjustification?: string
}>();


const userStore = useUserStore()
const show = ref(false);

const ToEmail = 'nvd@nist.gov'
const CCEmail = 'secalert@redhat.com'
const Subject = `CVSS Rescore Request - ${props.cveid}`

const EmailBody = `Hello,

I have performed an analysis of ${props.cveid} on behalf of Red Hat Product Security, resulting in a Red Hat CVSS score which is different from the NIST score. Our information and analysis is included below, and we would appreciate your consideration and review.

CVE : ${props.cveid}
Flaw Summary : ${props.flawSummary}

Red Hat Bugzilla : ${props.bugzilla}
NVD Page : ${props.nvdpage}

Red Hat CVSS : ${props.cvss}
NIST CVSS : ${props.nistcvss}
Red Hats CVSS Justification : "cvss justification"
`

const EmailFooter = `Thank you so much for your time and consideration.;

-${userStore.userName}`

function openModal() {
  show.value = true;
}

function Cancel() {
  show.value = false;
}

function openMailto() {
  window.open(mailto.value, '_blank');
}

const mailto = computed<string>(() => {
  const recipient = encodeURI('nvd@nist.gov');
  const cc = encodeURI('secalert@redhat.com');
  const encodedSubject = encodeURIComponent(Subject);

  const body = (
    EmailBody + '\n\n' + (EmailFooter)
  );
  const encodedBody = encodeURIComponent(body);

  const mailto = `mailto:${recipient}?cc=${cc}&subject=${encodedSubject}&body=${encodedBody}`;
  return mailto;
})
</script>

<template>
  <div>
    <button type="button" class="btn btn-secondary mt-2 " @click="openModal">Email NIST</button>
    <Transition name="cvssnistform">
      <div v-if="show" class="modal fade" :class="{ show: show }" :style="{ display: show ? 'block' : 'none' }"
        :aria-hidden="!show" tabindex="-1" aria-labelledby="modalTitle" :role="show ? 'dialog' : ''">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header">
              <slot name="header">
                <h1 class="modal-title fs-5"> Email NIST</h1>
                <button type="button" class="btn-close" aria-label="Close" @click="Cancel"></button>
              </slot>
            </div>
            <div class="modal-body">
              <div class="modal-body-wrapper">
                <slot name="body">
                  <div class="modal-scroll">
                    <label class="osim-modal-label mb-3 body-content w-100 border p-2">
                      <div class="m-4 pr-5">
                        <p><span class="fw-bold">To:</span> <span class="to-email">{{ ToEmail }}</span></p>
                        <p class="from-email"><span class="fw-bold">From:</span> {{ userStore.userEmail }}</p>
                        <p><span class="fw-bold">CC:</span> <span class="cc-email">{{ CCEmail }}</span></p>
                        <hr />
                        <p>Subject:</p>
                        <div class="w-100 mb-2">
                          <input class="form-control" :readonly="true" type="text" :value="Subject" />
                        </div>
                        <hr />
                        <div class="resizable-input">
                          <LabelTextarea label="Body:" v-model="EmailBody" />
                          <LabelTextarea label="" v-model="EmailFooter" :hideLabel=true />
                        </div>
                      </div>
                    </label>
                  </div>
                </slot>
              </div>
            </div>
            <div class="modal-footer">
              <slot name="footer">
                <p class="text-email text-warning ">Sending reloads the flaw page discarding all
                  the unsaved changes</p>
                <button type="button" class="btn btn-secondary cancel-btn" @click="Cancel">Cancel</button>
                <button type="button" @click.prevent="openMailto" class="btn btn-primary send-email">Send
                  Email</button>
              </slot>
            </div>
          </div>
        </div>
      </div>
    </Transition>
    <Transition name="modal-bg">
      <div v-if="show" class="modal-backdrop fade show"></div>
    </Transition>
  </div>
</template>

<style scoped>
.resizable-input {
  margin-left: -18px
}

.border-start {
  border-left: none !important;
}

.text-email {
  margin-right: 6rem;
}

.osim-modal-label {
  height: 600px;
  overflow-y: auto;
}</style>