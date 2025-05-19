<script setup lang="ts">
import { nextTick, computed, ref } from 'vue';

import { isDefined, watchDebounced } from '@vueuse/core';

import { createCatchHandler } from '@/composables/service-helpers';

import LabelTextarea from '@/widgets/LabelTextarea/LabelTextarea.vue';
import type { ZodJiraUserAssignableType } from '@/types/zodJira';
import { searchJiraUsers } from '@/services/JiraService';
import DropDown from '@/widgets/DropDown/DropDown.vue';
import JiraUser from '@/widgets/JiraUser/JiraUser.vue';
import { CommentType } from '@/types';

const props = defineProps<{
  internalCommentsAvailable: boolean;
  isAddingNewComment: boolean;
  isSaving: boolean;
  newCommentType: CommentType;
  taskKey: null | string | undefined;
  unifiedView: boolean;
}>();

const emit = defineEmits<{
  cancelComment: [];
  saveComment: [newComment: string];
}>();

const newComment = ref('');
const refTextArea = ref<InstanceType<typeof LabelTextarea> | null>(null);
const suggestions = ref<ZodJiraUserAssignableType[]>([]);
const isLoadingSuggestions = ref(false);
const caretPos = ref(['0px', '0px']);

const isInternalComment = computed(() => props.newCommentType === CommentType.Internal);

watchDebounced(newComment, async () => {
  if (!isDefined(newComment)
    || newComment.value === ''
    || !refTextArea.value?.elTextArea?.value
    || !isInternalComment.value
    || !props.taskKey) {
    return;
  }

  const lastWord = getLastWord();
  if (!lastWord?.startsWith('@') || lastWord.length < 2) {
    return;
  }
  isLoadingSuggestions.value = true;
  const users = await searchJiraUsers(lastWord.slice(1), props.taskKey)
    .catch(createCatchHandler('Failed to load jira users', false))
    .finally(() => {
      isLoadingSuggestions.value = false;
      nextTick(() => refTextArea.value?.elTextArea?.focus());
    });

  if (!users?.data?.users) {
    return;
  }
  calculateDropdownPosition(lastWord);
  nextTick(() => {
    suggestions.value = users.data?.users;
  });
}, { debounce: 500 });

const calculateDropdownPosition = (lastWord: string) => {
  const elTextArea = refTextArea.value!.elTextArea;
  const selectionStart = elTextArea?.selectionStart ?? 0;

  const textAreaRect = elTextArea!.getBoundingClientRect();
  const textAreaStyle = getComputedStyle(elTextArea!);
  const paddingLeft = Number.parseInt(textAreaStyle.getPropertyValue('padding-left').replace('px', ''));
  const paddingTop = Number.parseInt(textAreaStyle.getPropertyValue('padding-top').replace('px', ''));
  const lineHeight = Number.parseInt(textAreaStyle.getPropertyValue('line-height').replace('px', ''));

  const textAreaOffset = (textAreaRect.top ?? 0) - (elTextArea!.parentElement?.getBoundingClientRect()?.top ?? 0);
  const horizontalPos = selectionStart - newComment.value.slice(0, selectionStart).lastIndexOf('\n') - lastWord.length;
  const verticalPos = elTextArea!.value.slice(0, selectionStart).split('\n').length ?? 0;

  caretPos.value[0] = `calc(${paddingLeft}px + ${horizontalPos}ch)`;
  caretPos.value[1] = (textAreaOffset + paddingTop + Math.min(lineHeight * verticalPos, textAreaRect.height)) + 'px';
};

const handleSuggestionClick = (user: any) => {
  const lastWord = getLastWord();
  if (!lastWord) {
    return;
  }

  const username = `[~${user.name}]`;
  const contentBefore = newComment.value.slice(0, newComment.value.lastIndexOf(lastWord));
  const contentAfter = newComment.value.slice(newComment.value.lastIndexOf(lastWord) + lastWord.length);

  newComment.value = contentBefore + username + contentAfter;

  suggestions.value = [];
  refTextArea.value?.elTextArea?.focus();
};

const getLastWord = () => {
  const elTextArea = refTextArea.value?.elTextArea;
  const selectionStart = elTextArea?.selectionStart ?? 0;

  return newComment.value?.slice(0, selectionStart).split('\n')?.pop()?.split(' ')?.pop();
};

const clearSuggestions = (event: FocusEvent | KeyboardEvent | MouseEvent) => {
  if (event instanceof KeyboardEvent
    && ['ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'Enter', 'Escape', 'Tab']
      .includes(event.key)) {
    suggestions.value = [];
    return;
  }

  if (event instanceof MouseEvent) {
    suggestions.value = [];
    return;
  }

  if (event instanceof FocusEvent
    && event.relatedTarget !== event.currentTarget
    && !(event.currentTarget as Node)?.contains(event.relatedTarget as Node)
  ) {
    suggestions.value = [];
  }
};

function commentTypeString(type: CommentType | undefined): string {
  return type !== undefined ? CommentType[type] : '';
}
</script>

<template>
  <div
    v-if="(isAddingNewComment && !isSaving)"
    class="position-relative mb-4 pb-2"
    tabindex="-1"
    @blur.capture="clearSuggestions"
  >
    <div v-if="newCommentType === CommentType.Public" class="alert alert-warning">
      Any information provided in this comment will be publicly visible on Bugzilla.
    </div>
    <template v-if="!isInternalComment">
      <LabelTextarea v-model="newComment" :label="`New ${commentTypeString(newCommentType)} Comment`" />
    </template>
    <template v-if="isInternalComment && internalCommentsAvailable">
      <LabelTextarea
        ref="refTextArea"
        v-model="newComment"
        :label="`New ${commentTypeString(newCommentType)} Comment`"
        :disabled="isLoadingSuggestions"
        :loading="isLoadingSuggestions"
        @keydown="clearSuggestions"
        @click="clearSuggestions"
      />
      <DropDown
        v-if="suggestions.length > 0"
        :style="{ width: 'auto', left: caretPos[0], top: caretPos[1], right: 'auto' }"
      >
        <div
          v-for="user in suggestions"
          :key="user.name"
          class="item"
          @click="handleSuggestionClick(user)"
        >
          <JiraUser v-bind="user" :query="getLastWord()?.slice(1)" />
        </div>
      </DropDown>
    </template>
    <button type="button" class="btn btn-primary col" @click="emit('saveComment', newComment); newComment = ''">
      Save {{ commentTypeString(newCommentType) }} Comment
    </button>
    <button type="button" class="btn ms-3 btn-secondary col" @click="emit('cancelComment')">
      Cancel
    </button>
  </div>
</template>
