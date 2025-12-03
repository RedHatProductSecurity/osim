<script setup lang="ts">
import { ref } from 'vue';

import Modal from '@/widgets/Modal/Modal.vue';

const props = defineProps<{
  show: boolean;
}>();

const emit = defineEmits<{
  cancel: [];
  submit: [comment: string];
}>();

const comment = ref('');

function handleSubmit() {
  emit('submit', comment.value);
  comment.value = '';
}

function handleCancel() {
  emit('cancel');
  comment.value = '';
}
</script>

<template>
  <Modal :show="props.show" @close="handleCancel">
    <template #title>
      Feedback Comment
    </template>
    <template #body>
      <p class="text-muted mb-3">
        Please provide additional details about why this suggestion was unhelpful (optional).
      </p>
      <textarea
        v-model="comment"
        class="form-control"
        rows="4"
        placeholder="Enter your feedback comment..."
      />
    </template>
    <template #footer>
      <button
        type="button"
        class="btn btn-secondary"
        @click="handleCancel"
      >
        Cancel
      </button>
      <button
        type="button"
        class="btn btn-primary"
        @click="handleSubmit"
      >
        Submit Feedback
      </button>
    </template>
  </Modal>
</template>
