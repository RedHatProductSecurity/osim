<script setup lang="ts">
import { ref } from 'vue';
import LabelTextarea from '@/components/widgets/LabelTextarea.vue';

defineProps<{
  comments: any[];
}>();
const newPublicComment = ref('');
const isAddCommentShown = ref(false);

const emit = defineEmits<{
  'comment:add-public': [value: any];
}>();

function handleClick() {
  emit('comment:add-public', newPublicComment.value);
  isAddCommentShown.value = false;
}

</script>

<template>
  <h4 class="mt-3 mb-2">Comments</h4>
  <div class="row">
    <ul class="col-6">
      <li v-for="(comment, commentIndex) in comments" :key="commentIndex" class="p-3">
        <p class="border-top pt-2">
          <span
            v-if="(comment.meta_attr?.is_private || '').toLowerCase() === 'true'"
            class="badge bg-warning rounded-pill"
          >
            Bugzilla Internal
          </span>
          {{ comment.meta_attr?.creator }} /
          <a :href="'#' + comment.type + '/' + comment.external_system_id">
            {{ comment.meta_attr?.time }}
          </a>
        </p>
        <p>{{ comment.meta_attr?.text }}</p>
      </li>
    </ul>
    <div v-if="!isAddCommentShown">
      <button type="button" class="btn btn-secondary col" @click="isAddCommentShown = true">
        Add Public Comment
      </button>
    </div>
    <div v-if="isAddCommentShown">
      <LabelTextarea v-model="newPublicComment" label="New Public Comment" />
      <button type="button" class="btn btn-primary col" @click="handleClick">
        Add Public Comment
      </button>
      <!--<button type="button" class="btn btn-primary col">Add Private Comment</button>-->
    </div>
  </div>
</template>
