<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { isDefined, watchDebounced } from '@vueuse/core';
import type { ZodJiraUserAssignableType } from '@/types/zodJira';
import LabelTextarea from '@/components/widgets/LabelTextarea.vue';
import sanitizeHtml from 'sanitize-html';
import { osimRuntime } from '@/stores/osimRuntime';
import { useUserStore } from '@/stores/UserStore';
import { DateTime } from 'luxon';
import Tabs from '@/components/widgets/Tabs.vue';
import DropDown from '@/components/widgets/DropDown.vue';
import { createCatchHandler } from '@/composables/service-helpers';
import { searchJiraUsers, jiraTaskUrl } from '@/services/JiraService';
import { type ZodFlawCommentSchemaType } from '@/types/zodFlaw';
import JiraUser from './widgets/JiraUser.vue';
import { type ZodFlawCommentType } from '@/types/zodFlaw';

const userStore = useUserStore();

const props = defineProps<{
  publicComments: ZodFlawCommentType[];
  privateComments: ZodFlawCommentType[];
  internalComments: ZodFlawCommentType[];
  internalCommentsAvailable: boolean;
  isLoadingInternalComments: boolean;
  systemComments: ZodFlawCommentType[];
  taskKey: string;
  bugzillaLink: string;
  isSaving: boolean;
}>();

enum CommentType {
    Public,
    Private,
    Internal,
    System,
}

const newComment = ref('');
const isAddingNewComment = ref(false);

const emit = defineEmits<{
  'comment:addFlawComment': [comment: string, creator: string, type: string];
  'loadInternalComments': [];
}>();

const commentLabels = computed(() => {
  return Object.keys(CommentType)
    .filter((key) => isNaN(Number(key)))
    .map((key) => `${key} Comments`);
});

const commentTooltips: Record<CommentType, string> = {
  [CommentType.Public]: 'Bugzilla Public - This comments are visible to everyone.',
  [CommentType.Private]: 'Bugzilla Private - This comments are visible to Red Hat associates.',
  [CommentType.Internal]: 'Jira Internal - This comments are visible to team members with required permissions.',
  [CommentType.System]: 'Bugzilla System - This are auto-generated private comments.',
};

const selectedTab = ref(CommentType.Public);
const handleTabChange = (index: number) => {
  selectedTab.value = index;
};

const displayedComments = computed(() => {
  switch (selectedTab.value) {
  case CommentType.Public:
    return props.publicComments;
  case CommentType.Private:
    return props.privateComments;
  case CommentType.Internal:
    return props.internalComments;
  case CommentType.System:
    return props.systemComments;
  default:
    return [];
  }
});

onMounted(async () => {
  emit('loadInternalComments');
});

async function handleCommentSave() {
  emit(
    'comment:addFlawComment',
    newComment.value,
    userStore.userName,
    CommentType[selectedTab.value],
  );
  newComment.value = '';
  isAddingNewComment.value = false;
}

function sanitize(text: string) {
  const bugzillaLink = `${osimRuntime.value.backends.bugzilla}/show_bug.cgi?id=`;

  const urlRegex = /\b(https?:\/\/[\S]+)\b/g;
  const jiraTagRegex = /\[~([^[\]]+)\]/g;
  const bugzillaRegex = /\[bug (\d+)\]/g;
  return (
    sanitizeHtml(text)
      .replace(urlRegex, '<a target="_blank" href="$1">$1</a>')
      .replace(jiraTagRegex, (match, p1) => `${p1}`)
      .replace(bugzillaRegex, `<a target="_blank" href="${bugzillaLink}$1">[bug $1]</a>`)
  );
}

const isInternalComment = computed(() => selectedTab.value === CommentType.Internal);
const refTextArea = ref<InstanceType<typeof LabelTextarea> | null>(null);
const suggestions = ref<ZodJiraUserAssignableType[]>([]);
const isLoadingSuggestions = ref(false);
const caretPos = ref(['0px', '0px']);

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
    && ['Escape', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Tab']
      .includes(event.key)) {
    suggestions.value = [];
    return;
  }

  if (event instanceof MouseEvent) {
    suggestions.value = [];
    return;
  }

  if (event instanceof FocusEvent) {
    if (
      event.relatedTarget !== event.currentTarget
      && !(event.currentTarget as Node)?.contains(event.relatedTarget as Node)
    ) {
      suggestions.value = [];
    }
  }
};
</script>

<template>
  <section class="osim-comments my-2">
    <h4 class="mb-4">Comments</h4>
    <Tabs
      :labels="commentLabels"
      :default="0"
      :tooltips="Object.values(commentTooltips)"
      @tab-change="handleTabChange"
    >
      <template #header-actions>
        <div class="tab-actions">
          <button
            v-if="(
              !isAddingNewComment
              && selectedTab !== CommentType.System)
              && (internalCommentsAvailable || selectedTab !== CommentType.Internal
              )"
            type="button"
            class="btn btn-secondary tab-btn"
            :disabled="isSaving"
            @click="isAddingNewComment = true"
          >
            Add {{ CommentType[selectedTab] }} Comment
          </button>
          <a
            v-if="(selectedTab === CommentType.Public || selectedTab === CommentType.Private)"
            :href="bugzillaLink"
            target="_blank"
            class="btn btn-secondary tab-btn"
            :disabled="isSaving"
          >
            View on Bugzilla
          </a>
          <a
            v-if="(selectedTab === CommentType.Internal && internalCommentsAvailable)"
            :href="jiraTaskUrl(taskKey)"
            target="_blank"
            class="btn btn-secondary tab-btn"
            :disabled="isSaving"
          >
            View on Jira
          </a>
        </div>
      </template>
      <template #tab-content>
        <div class="tab-content">
          <div
            v-if="(
              isAddingNewComment
              && selectedTab !== CommentType.System)
              && (internalCommentsAvailable
                || selectedTab !== CommentType.Internal
              )"
            class="position-relative"
            tabindex="-1"
            @blur.capture="clearSuggestions"
          >
            <template v-if="!isInternalComment">
              <LabelTextarea v-model="newComment" :label="`New ${CommentType[selectedTab]} Comment`" />
            </template>
            <template v-if="isInternalComment">
              <LabelTextarea
                ref="refTextArea"
                v-model="newComment"
                :label="`New ${CommentType[selectedTab]} Comment`"
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
            <button type="button" class="btn btn-primary col" @click="handleCommentSave">
              Save {{ CommentType[selectedTab] }} Comment
            </button>
            <button type="button" class="btn ms-3 btn-secondary col" @click="isAddingNewComment = false">
              Cancel
            </button>
          </div>
          <ul class="comments list-unstyled">
            <span
              v-if="isLoadingInternalComments && selectedTab === CommentType.Internal"
              class="spinner-border spinner-border-sm d-inline-block ms-3"
              role="status"
            >
              <span class="visually-hidden">Loading...</span>
            </span>
            <div v-else-if="!internalCommentsAvailable && selectedTab === CommentType.Internal" class="ms-3">
              Internal comments not available
            </div>
            <div v-else-if="displayedComments?.length === 0" class="ms-3">
              No {{ CommentType[selectedTab].toLowerCase() }} comments
            </div>
            <li
              v-for="(comment, commentIndex) in displayedComments"
              :key="commentIndex"
              class="bg-light p-4 mt-3 rounded-2"
            >
              <p class="border-bottom pb-3">
                <i class="bi bi-caret-right-fill"></i>
                {{ comment.creator }}
                - {{ DateTime.fromISO(comment.created_dt ?? '',{ setZone: true })
                  .toFormat('yyyy-MM-dd hh:mm a ZZZZ') }}
                <span
                  class="badge rounded-pill float-end cursor-pointer"
                  :class="{
                    'bg-success': selectedTab === CommentType.Public,
                    'bg-info': selectedTab === CommentType.Private,
                    'bg-danger': selectedTab === CommentType.Internal,
                    'bg-warning text-black': selectedTab === CommentType.System,
                  }"
                >
                  {{ CommentType[selectedTab] }}
                </span>
              </p>
              <!--eslint-disable-next-line vue/no-v-html -->
              <p class="osim-flaw-comment" v-html="sanitize(comment.text ?? '')" />
            </li>
          </ul>
        </div>
      </template>
    </Tabs>
  </section>
</template>

<style scoped lang="scss">
.tab-actions {
  margin-left: auto;

  .tab-btn {
    margin-left: 3px;
    margin-top: 3px;
    border-bottom-right-radius: 0;
    border-bottom-left-radius: 0;
  }
}

.tab-content {
  min-height: 250px;
  margin-top: 25px;
}

.osim-comments {
  .osim-comment-filter {
    text-transform: capitalize;
  }

  section.osim-comments {
    li {
      list-style-type: none;
      background-color: red;
    }
  }

  .osim-flaw-comment {
    white-space: pre-wrap;
  }
}
</style>
