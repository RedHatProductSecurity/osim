<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

import { storeToRefs } from 'pinia';

import CommentList from '@/components/FlawComments/CommentList.vue';
import CommentsToolbar from '@/components/FlawComments/CommentsToolbar.vue';
import NewCommentForm from '@/components/FlawComments/NewCommentForm.vue';

import Tabs from '@/widgets/Tabs/Tabs.vue';
import { useUserStore } from '@/stores/UserStore';
import { type ZodFlawCommentType } from '@/types/zodFlaw';
import { CommentType, commentTooltips } from '@/constants';
import { orderCommentsByDate } from '@/utils/helpers';
import { useSettingsStore } from '@/stores/SettingsStore';

const props = defineProps<{
  bugzillaLink: string;
  commentsByType: Record<CommentType, ZodFlawCommentType[]>;
  internalCommentsAvailable: boolean;
  isLoadingInternalComments: boolean;
  isSaving: boolean;
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
  () => orderCommentsByDate(Object.values(props.commentsByType).flat()),
);

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
  props.commentsByType[CommentType.Private].length > 0
  || props.commentsByType[CommentType.Public].length > 0
  || props.commentsByType[CommentType.System].length > 0,
);

const showJiraLink = computed(() =>
  props.internalCommentsAvailable && props.commentsByType[CommentType.Internal].length > 0,
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
    <div v-if="!internalCommentsAvailable && settings['unifiedCommentsView']" class="alert alert-danger">
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
            <div v-else-if="commentsByType[selectedTab]?.length === 0">
              No {{ CommentType[selectedTab].toLowerCase() }} comments
            </div>
          </div>
          <CommentList :commentList="commentsByType[selectedTab]" />
        </div>
      </template>
    </Tabs>
    <div v-else style="min-height: 250px;">
      <CommentList :commentList="unifiedComments" />
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
