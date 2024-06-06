<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import LabelTextarea from '@/components/widgets/LabelTextarea.vue';
import sanitizeHtml from 'sanitize-html';
import { osimRuntime } from '@/stores/osimRuntime';
import { useUserStore } from '@/stores/UserStore';
import { DateTime } from 'luxon';
import Tabs from '@/components/widgets/Tabs.vue';
import { useInternalComments } from '@/composables/useInternalComments';
import { taskUrl } from '@/services/JiraService';

const userStore = useUserStore();

const props = defineProps<{
  comments: any[];
  taskKey: string | null | undefined;
  isSaving: boolean;
}>();

enum CommentTab {
    Public,
    Internal,
    System,
}

const {
  internalComments,
  addInternalComment,
  loadInternalComments,
  isSavingInternalComment,
  isLoadingInternalComments,
  internalCommentsAvailable,
} = useInternalComments(props.taskKey ?? '');

watch(isSavingInternalComment, () => {
  emit('disableForm', isSavingInternalComment.value);
});

const newComment = ref('');
const isAddingNewComment = ref(false);

const emit = defineEmits<{
  'comment:addPublicComment': [value: any, value: any];
  'disableForm': [value: boolean];
}>();

const SYSTEM_EMAIL = 'bugzilla@redhat.com';

const tabLabels = ['Public Comments', 'Internal Comments', 'System Comments'];
const selectedTab = ref(CommentTab.Public);
const handleTabChange = (index: number) => {
  selectedTab.value = index;
};


type CommentFilter = 'public' | 'private' | 'system';
type CommentFilterFunctions = Record<CommentFilter, (comment: any) => boolean>;

const filterFunctions: CommentFilterFunctions = {
  public: (comment: any) => !comment.is_private,
  private: (comment: any) => comment.is_private,
  system: (comment: any) => comment.creator === SYSTEM_EMAIL,
};

function parseOsidbComments(comments: any) {
  return comments.map((comment: any) => {
    return {
      author: comment.creator,
      timestamp: comment.created_dt,
      body: comment.text,
    };
  });
}

const publicComments = computed(() => parseOsidbComments(props.comments.filter(filterFunctions.public)));
const systemComments = computed(() => parseOsidbComments(props.comments.filter(filterFunctions.system)));

const displayedComments = computed(() => {
  switch (selectedTab.value) {
  case CommentTab.Public:
    return publicComments.value;
  case CommentTab.Internal:
    return internalComments.value;
  case CommentTab.System:
    return systemComments.value;
  default:
    return [];
  }
});

onMounted(async () => {
  loadInternalComments();
});

async function handleCommentSave() {
  if (selectedTab.value === CommentTab.Public) {
    // Public comment save
    emit('comment:addPublicComment', newComment.value, userStore.userName);
    isAddingNewComment.value = false;
    newComment.value = '';
  } else if (selectedTab.value === CommentTab.Internal && props.taskKey) {
    // Internal comment save
    await addInternalComment(newComment.value)
      .then(() => {
        isAddingNewComment.value = false;
        newComment.value = '';
      });
  }
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
</script>

<template>
  <section class="osim-comments">
    <h4 class="mb-4">Comments</h4>
    <Tabs
      :labels="tabLabels"
      :default="0"
      @tab-change="handleTabChange"
    >
      <template #header-actions>
        <div class="tab-actions">
          <button
            v-if="(
              !isAddingNewComment
              && selectedTab !== CommentTab.System)
              && (internalCommentsAvailable() || selectedTab !== CommentTab.Internal
              )"
            type="button"
            class="btn btn-secondary tab-btn"
            :disabled="isSaving"
            @click="isAddingNewComment = true"
          >
            Add {{ tabLabels[selectedTab].slice(0, -1) }}
          </button>
          <a
            v-if="(selectedTab === CommentTab.Internal && internalCommentsAvailable())"
            :href="taskUrl(taskKey ?? '#')"
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
              && selectedTab !== CommentTab.System)
              && (internalCommentsAvailable()
                || selectedTab !== CommentTab.Internal
              )"
          >
            <LabelTextarea v-model="newComment" :label="`New ${tabLabels[selectedTab].slice(0, -1)}`" />
            <button type="button" class="btn btn-primary col" @click="handleCommentSave">
              Save {{ tabLabels[selectedTab].slice(0, -1) }}
            </button>
            <button type="button" class="btn ms-3 btn-secondary col" @click="isAddingNewComment = false">
              Cancel
            </button>
          </div>
          <ul class="comments list-unstyled">
            <span
              v-if="isLoadingInternalComments && selectedTab === CommentTab.Internal"
              class="spinner-border spinner-border-sm d-inline-block ms-3"
              role="status"
            >
              <span class="visually-hidden">Loading...</span>
            </span>
            <div v-else-if="!internalCommentsAvailable() && selectedTab === CommentTab.Internal" class="ms-3">
              Internal comments not available
            </div>
            <div v-else-if="displayedComments.length === 0" class="ms-3">
              No {{ tabLabels[selectedTab] }}
            </div>
            <li
              v-for="(comment, commentIndex) in displayedComments"
              :key="commentIndex"
              class="bg-light p-4 mt-3 rounded-2"
            >
              <p class="border-bottom pb-3">
                <i class="bi bi-caret-right-fill"></i>
                {{ comment.author }} - {{ DateTime.fromISO(comment.timestamp).toFormat('yyyy-MM-dd hh:mm a ZZZZ') }}
                <span
                  class="badge rounded-pill float-end"
                  :class="{
                    'bg-info': selectedTab === CommentTab.Public,
                    'bg-danger': selectedTab === CommentTab.Internal,
                    'bg-warning text-black': selectedTab === CommentTab.System,
                  }"
                >
                  {{ tabLabels[selectedTab].split(' ')[0] }}
                </span>
              </p>
              <p class="osim-flaw-comment" v-html="sanitize(comment.body)" />
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
