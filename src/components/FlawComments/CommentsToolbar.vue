<script setup lang="ts">
import { jiraTaskUrl } from '@/services/JiraService';
import { CommentType } from '@/types';

defineProps<{
  bugzillaLink: string;
  internalCommentsAvailable: boolean;
  isAddingNewComment: boolean;
  isSaving: boolean;
  newCommentAllowed: boolean;
  newCommentType: CommentType;
  showBugzillaLink: boolean;
  showJiraLink: boolean;
  taskKey: null | string | undefined;
  unifiedView: boolean;
}>();

const emit = defineEmits<{
  startNewComment: [type: CommentType];
  toggleView: [];
}>();
</script>

<template>
  <div class="d-flex mb-4 sticky-top p-3 ps-0 border-bottom align-items-center" style="background-color: white;">
    <div class="d-flex gap-2">
      <button
        type="button"
        class="btn btn-secondary"
        :disabled="!newCommentAllowed || isSaving || (isAddingNewComment && newCommentType === CommentType.Public)"
        @click="emit('startNewComment', CommentType.Public)"
      >
        Add Public Comment
      </button>
      <button
        type="button"
        class="btn btn-secondary"
        :disabled="!newCommentAllowed || isSaving || (isAddingNewComment && newCommentType === CommentType.Private)"
        @click="emit('startNewComment', CommentType.Private)"
      >
        Add Private Comment
      </button>
      <button
        type="button"
        class="btn btn-secondary"
        :disabled="
          !internalCommentsAvailable
            || !newCommentAllowed
            || isSaving
            || (isAddingNewComment && newCommentType === CommentType.Internal)
        "
        @click="emit('startNewComment', CommentType.Internal)"
      >
        Add Internal Comment
      </button>
      <a
        v-if="showBugzillaLink"
        :href="bugzillaLink"
        target="_blank"
        class="btn tab-btn border border-secondary"
        :disabled="isSaving"
      >
        View in Bugzilla
      </a>
      <a
        v-if="showJiraLink"
        :href="taskKey ? jiraTaskUrl(taskKey) : '#'"
        target="_blank"
        class="btn tab-btn border border-secondary"
        :disabled="isSaving"
      >
        View in Jira
      </a>
    </div>
    <div class="form-check form-switch ms-auto" style="font-size: 18px">
      <input
        id="singleViewSwitch"
        class="form-check-input"
        type="checkbox"
        :value="unifiedView"
        @click="emit('toggleView')"
      >
      <label class="form-check-label" for="singleViewSwitch" style="user-select: none;">Unified view</label>
    </div>
  </div>
</template>
