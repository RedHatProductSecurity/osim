<script setup lang="ts">
import sanitizeHtml from 'sanitize-html';
import { ref } from 'vue';
import * as marked from 'marked';
import Modal from '@/components/widgets/Modal.vue';
import { useModal } from '@/composables/useModal';

const { isModalOpen, openModal, closeModal } = useModal();

const html = ref({ header:'', body: '' });

function fetchChangeLog() {
  return fetch('/CHANGELOG.md')
    .then((response) => response.text())
    .then(async (text) => {
      const parsedCleanHtml = await marked.parse(sanitizeHtml(text));
      const htmlAsDom = new DOMParser().parseFromString(parsedCleanHtml, 'text/html');
      const domHeader = htmlAsDom.querySelector('h1');
      html.value.header = domHeader?.outerHTML || '';
      if(domHeader) {
        domHeader.outerHTML = '';
      }
      htmlAsDom.querySelectorAll('a').forEach((a) => {
        a.setAttribute('target', '_blank');
      });
      html.value.body = htmlAsDom.body.outerHTML || '';
    });
}

fetchChangeLog();
</script>

<template>
  <div class="osim-changelog" attrs="$attrs">
    <a href="#" class="m-0 p-0" @click.prevent="openModal">Changelog</a>
    <Modal :show="isModalOpen" @close="closeModal">
      <template #header>
        <div class="d-flex justify-content-between w-100">

          <div v-html="html.header" />
          <button
            type="button"
            class="btn-close"
            aria-label="Close"
            @click="closeModal"
          ></button>
        </div> 
  
      </template>
      <template #body>
        <div v-html="html.body" />
      </template>
      <template #footer>
        <button class="btn btn-primary" @click="closeModal">Close</button>
      </template>
    </Modal>
  </div>
</template>

<style lang="scss" scoped>
.osim-changelog :deep(.modal-dialog) {
  max-width: 80ch;
  max-height: 80vh;
  overflow-y: auto;

  * {
    width: 100%;
  }
}
</style>
