<script setup lang="ts">
import { ref, onMounted } from 'vue';

import sanitizeHtml from 'sanitize-html';
import * as marked from 'marked';

import { useModal } from '@/composables/useModal';

import Modal from '@/widgets/Modal/Modal.vue';

const { closeModal, isModalOpen, openModal } = useModal();

const html = ref({ header: '', body: '' });

function fetchChangeLog() {
  const scriptEl = document.head.querySelector('script[src]') as HTMLScriptElement;
  const buildString = scriptEl?.src?.match(/\/index-(\w+)\.js/)?.[1];
  return fetch(`/CHANGELOG.md?build=${buildString}`)
    .then(response => response.text())
    .then(async (text) => {
      const parsedCleanHtml = await marked.parse(sanitizeHtml(text));
      const htmlAsDom = new DOMParser().parseFromString(parsedCleanHtml, 'text/html');
      const domHeader = htmlAsDom.querySelector('h1');
      html.value.header = domHeader?.outerHTML || '';
      if (domHeader) {
        domHeader.outerHTML = '';
      }
      htmlAsDom.querySelectorAll('a').forEach((a) => {
        a.setAttribute('target', '_blank');
      });
      html.value.body = htmlAsDom.body.outerHTML || '';
    });
}
onMounted(fetchChangeLog);
</script>

<template>
  <div class="osim-changelog">
    <a href="#" class="m-0 p-0" @click.prevent="openModal">
      <span class="badge bg-success rounded-pill">🪵 OSIM CHANGELOG 🪵</span>
    </a>
    <Modal :show="isModalOpen" @close="closeModal">
      <template #header>
        <div class="d-flex justify-content-between w-100 alert alert-info m-0">
          <!--eslint-disable-next-line vue/no-v-html -->
          <div v-html="html.header" />
          <div>
            <button
              type="button"
              class="btn-close"
              aria-label="Close"
              @click="closeModal"
            ></button>
          </div>
        </div>

      </template>
      <template #body>
        <!--eslint-disable-next-line vue/no-v-html -->
        <div class="px-2" v-html="html.body" />
      </template>
    </Modal>
  </div>
</template>

<style lang="scss" scoped>
.osim-changelog {
  :deep(.modal-dialog) {
    max-width: 80ch;

    h1,
    h2,
    h3 {
      font-family: 'Red Hat Mono', monospace;
    }

    .modal-body {
      max-height: 80vh;
      overflow-y: auto;
    }

    .modal-header {
      padding: 0;
      border: none;

      > div {
        border-bottom-right-radius: 0;
        border-bottom-left-radius: 0;
      }
    }

    .modal-footer {
      display: none;
    }
  }
}
</style>
