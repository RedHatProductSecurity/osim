<script setup lang="ts">
import {computed, ref} from 'vue';

import {useToastStore} from '@/stores/ToastStore';
import {postFlawPublicComment} from '@/services/FlawService';
import {useUserStore} from '@/stores/UserStore';

import Modal from '@/components/widgets/Modal.vue';
import LabelInput from '@/components/widgets/LabelInput.vue';
import LabelTextarea from '@/components/widgets/LabelTextarea.vue';
import {getDisplayedOsidbError} from '@/services/OsidbAuthService';

const {addToast} = useToastStore();
const userStore = useUserStore();

const props = defineProps<{
  subject: string,
  description: string,
  osimLink: string,
  bugzillaLink: string,
}>();

const emit = defineEmits<{
  'refresh:flaw': [],
}>();

const modalShown = ref(false);

const subject = ref<string>(props.subject ?? '');
const description = ref<string>(props.description ?? '');
const appendixEl = ref<HTMLElement | null>(null);

function openMailto() {
  window.open(mailto.value, '_blank');
}

const mailto = computed<string>(() => {
  const recipient = encodeURI('secalert@redhat.com');
  const cc = encodeURI(userStore.userName);
  const encodedSubject = encodeURIComponent(subject.value);

  const body = (
    'Description:\n' +
    description.value + '\n\n' +
    'Appendix:\n' +
    (appendixEl.value?.innerText ?? '')
  );
  const encodedBody = encodeURIComponent(body);

  const mailto = `mailto:${recipient}?cc=${cc}&subject=${encodedSubject}&body=${encodedBody}`;
  return mailto;
});

const commentSaved = ref<boolean>(false);
const savingComment = ref<boolean>(false);

function addPublicCveRequestComment() {
  savingComment.value = true;
  // extract uuid from osimLink
  const flawUuidMatch = /\/flaws?\/([^#?]+)/.exec(props.osimLink);
  console.log('saving comment');
  if (flawUuidMatch != null) {
    // new Promise((resolve, reject) => {
    //   setTimeout(resolve, 5000);
    // })
    postFlawPublicComment(flawUuidMatch[1], 'New CVE Requested')
      .then(() => {
        commentSaved.value = true;
        savingComment.value = false;
        addToast({
          title: 'Request CVE',
          body: 'CVE Request comment saved',
        });
      })
      .catch(e => {
        commentSaved.value = false;
        savingComment.value = false;
        const displayedError = getDisplayedOsidbError(e);
        addToast({
          title: 'Request CVE',
          body: 'Failed to save CVE Request comment:\n' + displayedError,
        });
      });
  }
}


function openModal() {
  modalShown.value = true;
  commentSaved.value = false;
  savingComment.value = false;
}
function closeModal() {
  modalShown.value = false;
  if (commentSaved.value || savingComment.value) {
    emit('refresh:flaw');
    // location.reload(); // TODO extremely ugly hack
  }
}

</script>

<template>
  <!-- <div class="osim-toast-container toast-container position-fixed
    top-0 bottom-0 end-0 overflow-auto overflow-x-hidden p-3"> -->
  <div class="osim-cve-request-button">
    <button
      type="button"
      class="btn btn-secondary"
      @click="openModal"
    >
      Request CVE
    </button>

    <Modal :show="modalShown" @close="closeModal">
      <template #title>
        Request CVE
      </template>
      <template #body>
        <LabelInput v-model="subject" label="Subject" />
        <LabelTextarea v-model="description" label="Description" />

        <div class="osim-input mb-3 border-start ps-3">
          <span class="form-label">Appendix</span>
          <p
            ref="appendixEl"
            class="form-control"
          >
            OSIM: <a :href="osimLink">{{ osimLink }}</a><br />
            Bugzilla: <a :href="bugzillaLink">{{ bugzillaLink }}</a>
          </p>
        </div>

        <hr />
        <h2 class="h6">Step 1</h2>
        <div class="osim-request-cve-actions">
          <!--:href="mailto"-->
          <!--target="_blank"-->
          <!--rel="noopener noreferrer"-->
          <button
            type="button"
            class="btn btn-primary"
            role="button"
            @click.prevent="openMailto"
          >
            Open CVE Request Email Draft
          </button>
        </div>
        <h2 class="h6 mt-2">Step 2</h2>
        <p class="mb-2">(After sending the CVE Request Email)</p>
        <div class="osim-request-cve-actions">
          <button
            type="button"
            class="btn btn-primary"
            role="button"
            :disabled="commentSaved || savingComment"
            @click.prevent="addPublicCveRequestComment"
          >
            Add CVE Request Comment
            <span
              v-if="savingComment" 
              class="spinner-border spinner-border-sm d-inline-block"
              role="status"
            >
              <span class="visually-hidden">Saving...</span>
            </span>
            <i v-if="commentSaved" class="bi bi-check-circle d-inline-block" role="status">
              <span class="visually-hidden">Saved</span>
            </i>
          </button>
        </div>

      </template>

      <template #footer>
        <button
          type="button"
          class="btn btn-secondary"
          data-bs-dismiss="modal"
          @click="closeModal"
        >Close
        </button>
      </template>
    </Modal>
  </div>
</template>

<style scoped>
.osim-cve-request-button :deep(.modal-dialog) {
  max-width: 800px;
}

</style>
