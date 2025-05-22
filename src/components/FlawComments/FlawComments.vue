<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

import { storeToRefs } from 'pinia';

import CommentList from '@/components/FlawComments/CommentList.vue';
import CommentsToolbar from '@/components/FlawComments/CommentsToolbar.vue';
import NewCommentForm from '@/components/FlawComments/NewCommentForm.vue';

import { orderCommentsByDate } from '@/utils/helpers';
import Tabs from '@/widgets/Tabs/Tabs.vue';
import { useUserStore } from '@/stores/UserStore';
import { type ZodFlawCommentType } from '@/types/zodFlaw';
import { CommentType, commentTooltips } from '@/constants';
import { useSettingsStore } from '@/stores/SettingsStore';

const props = defineProps<{
  bugzillaLink: string;
  internalComments: ZodFlawCommentType[];
  internalCommentsAvailable: boolean;
  isLoadingInternalComments: boolean;
  isSaving: boolean;
  privateComments: ZodFlawCommentType[];
  publicComments: ZodFlawCommentType[];
  systemComments: ZodFlawCommentType[];
  taskKey: null | string | undefined;
}>();

const emit = defineEmits<{
  'comment:addFlawComment': [comment: string, creator: string, type: string];
  'loadInternalComments': [];
}>();

const userStore = useUserStore();
const { settings } = storeToRefs(useSettingsStore());

const newCommentType = ref<CommentType>(CommentType.Public);
const isAddingNewComment = ref(false);

const commentLabels = computed(() => {
  return Object.keys(CommentType)
    .filter(key => Number.isNaN(Number(key)))
    .map(key => `${key} Comments`);
});

const selectedTab = ref(CommentType.Public);
const handleTabChange = (index: number) => {
  selectedTab.value = index;
};

const unifiedComments = computed(
  () => {
    const unifiedCommentsArray = [
      ...props.publicComments,
      ...props.privateComments,
      ...props.systemComments,
      ...props.internalComments,
    ];
    return orderCommentsByDate(unifiedCommentsArray);
  },
);

const displayedComments = computed(() => {
  switch (selectedTab.value) {
    case CommentType.Public:
      return orderCommentsByDate(props.publicComments);
    case CommentType.Private:
      return orderCommentsByDate(props.privateComments);
    case CommentType.Internal:
      return orderCommentsByDate(props.internalComments);
    case CommentType.System:
      return orderCommentsByDate(props.systemComments);
    default:
      return [];
  }
});

onMounted(async () => {
  emit('loadInternalComments');
});

function startNewComment(type: CommentType) {
  isAddingNewComment.value = true;
  newCommentType.value = type;
}

async function handleCommentSave(newComment: string) {
  emit(
    'comment:addFlawComment',
    newComment,
    userStore.userName,
    CommentType[newCommentType.value],
  );
  isAddingNewComment.value = false;
}

function getCommentType(comment: ZodFlawCommentType) {
  if (props.publicComments.includes(comment)) {
    return CommentType.Public;
  } else if (props.privateComments.includes(comment)) {
    return CommentType.Private;
  } else if (props.internalComments.includes(comment)) {
    return CommentType.Internal;
  } else {
    return CommentType.System;
  }
}

function getCommentListWithTypes(list: ZodFlawCommentType[]) {
  return list.map(c => ({ ...c, type: getCommentType(c) }));
}

const newCommentAllowed = computed(() =>
  (
    (
      (
        selectedTab.value !== CommentType.System
        && (props.internalCommentsAvailable || selectedTab.value !== CommentType.Internal)
      )
      || (settings.value['singleCommentsView']))
  ),
);

const showBugzillaLink = computed(() =>
  props.privateComments.length > 0 || props.publicComments.length > 0 || props.systemComments.length > 0,
);

const showJiraLink = computed(() =>
  props.internalCommentsAvailable && props.internalComments.length > 0,
);
</script>

<template>
  <section class="osim-comments">
    <h4>Comments</h4>
    <CommentsToolbar
      :newCommentAllowed
      :showBugzillaLink
      :bugzillaLink
      :showJiraLink
      :isSaving
      :taskKey
      :isAddingNewComment
      :newCommentType
      :internalCommentsAvailable
      @startNewComment="(type) => startNewComment(type)"
    />
    <div v-if="!internalCommentsAvailable" class="alert alert-danger">
      Internal comments not available
    </div>
    <NewCommentForm
      :taskKey
      :isAddingNewComment
      :isSaving
      :newCommentType
      :internalCommentsAvailable
      @saveComment="(newComment) => handleCommentSave(newComment)"
      @cancelComment="() => isAddingNewComment = false"
    />
    <Tabs
      v-if="!settings['singleCommentsView']"
      :labels="commentLabels"
      :default="0"
      :tooltips="Object.values(commentTooltips)"
      @tab-change="handleTabChange"
    >
      <template #tab-content>
        <div class="tab-content">
          <div class="info-message ms-3 mb-4">
            <span
              v-if="isLoadingInternalComments && selectedTab === CommentType.Internal"
              class="spinner-border spinner-border-sm d-inline-block"
              role="status"
            >
              <span class="visually-hidden">Loading...</span>
            </span>
            <div v-else-if="!internalCommentsAvailable && selectedTab === CommentType.Internal">
              Internal comments not available
            </div>
            <div v-else-if="displayedComments?.length === 0">
              No {{ CommentType[selectedTab].toLowerCase() }} comments
            </div>
          </div>
          <CommentList :commentList="getCommentListWithTypes(displayedComments)" />
        </div>
      </template>
    </Tabs>
    <div v-else style="min-height: 250px;">
      <CommentList :commentList="getCommentListWithTypes(unifiedComments)" />
      <span v-if="unifiedComments.length <= 0" class="p-3">No comments</span>
    </div>
  </section>
</template>

<style scoped lang="scss">
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
