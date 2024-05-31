<script setup lang="ts">
import { computed, ref } from 'vue';
import LabelTextarea from '@/components/widgets/LabelTextarea.vue';
import sanitizeHtml from 'sanitize-html';
import { osimRuntime } from '@/stores/osimRuntime';
import { useUserStore } from '@/stores/UserStore';

const userStore = useUserStore();

const props = defineProps<{
  comments: any[];
  isSaving: boolean;
}>();
const newPublicComment = ref('');
const isAddingNewComment = ref(false);

const emit = defineEmits<{
  'comment:addPublicComment': [value: any, value: any];
}>();

const SYSTEM_EMAIL = 'bugzilla@redhat.com';


function handleClick() {
  emit('comment:addPublicComment', newPublicComment.value, userStore.userName);
  isAddingNewComment.value = false;
}

type CommentFilter = 'public' | 'private' | 'system';
type CommentActiveFilters = Record<CommentFilter, boolean>;
type CommentFilterFunctions = Record<CommentFilter, (comment: any) => boolean>;

const selectedFilters = ref<CommentActiveFilters>({
  public: true,
  private: false,
  system: false,
});

const filterFunctions: CommentFilterFunctions = {
  public: (comment: any) => !comment.is_private,
  private: (comment: any) => comment.is_private,
  system: (comment: any) => comment.creator === SYSTEM_EMAIL,
};

const activeFilters = computed(() => {
  if (Object.values(selectedFilters.value).every((isActive) => !isActive)) {
    return () => true;
  }

  const activeFilterFunctions = Object.entries(selectedFilters.value)
    .filter(([, isActive]) => isActive)
    .map(([filter]) => filterFunctions[filter as CommentFilter]);

  return (comment: any) =>
    activeFilterFunctions.reduce(
      (result, filterFunction) => result || filterFunction(comment),
      false,
    );
});
const filteredComments = computed(() => props.comments.filter(activeFilters.value));


const filters: CommentFilter[] = ['public', 'private', 'system'];

function linkify(text: string) {
  const bugzillaLink = `${osimRuntime.value.backends.bugzilla}/show_bug.cgi?id=`;

  const urlRegex = /\b(https?:\/\/[\S]+)\b/g;
  // Outputs: ["[jboss:INTLY-10833]"]
  // const jiraRegex = /\[jboss:\w+-\d+\]/g;
  const bugzillaRegex = /\[bug (\d+)\]/g;
  return (
    sanitizeHtml(text)
      .replace(urlRegex, '<a target="_blank" href="$1">$1</a>')
      // .replace(jiraRegex, '')
      .replace(bugzillaRegex, `<a target="_blank" href="${bugzillaLink}$1">[bug $1]</a>`)
  );
}
</script>

<template>
  <section class="osim-comments">
    <h4 class="mb-2">Comments</h4>
    <header class="nav">
      <span
        v-for="filter in filters"
        :key="filter"
        type="button"
        class="osim-comment-filter me-3"
        @click="selectedFilters[filter] = !selectedFilters[filter]"
      >
        <p class="visually-hidden">Comment Filter for toggling {{ filter }} comments</p>
        <div class="form-check form-switch">
          <input type="checkbox" class="form-check-input" :checked="selectedFilters[filter]" />
          {{ filter }}
        </div>
      </span>
    </header>
    <div class="row">
      <ul class="col-6">
        <li
          v-for="(comment, commentIndex) in filteredComments"
          :key="commentIndex"
          class="bg-light p-2 mt-3 rounded-2"
        >
          <p class="border-bottom pb-2">
            <span v-if="comment.is_private" class="badge bg-warning rounded-pill">
              Bugzilla Internal
            </span>
            <span
              v-if="comment.creator === SYSTEM_EMAIL"
              class="badge bg-info rounded-pill"
            >
              System
            </span>
            {{ comment.creator }} /
            <a :href="'#' + comment.type + '/' + comment.external_system_id">
              {{ comment.time }}
            </a>
          </p>
          <p class="osim-flaw-comment" v-html="linkify(comment.text)" />
        </li>
      </ul>
      <div v-if="!isAddingNewComment">
        <button
          type="button"
          class="btn btn-secondary col"
          :disabled="isSaving"
          @click="isAddingNewComment = true"
        >
          Add Public Comment
        </button>
      </div>
      <div v-if="isAddingNewComment">
        <LabelTextarea v-model="newPublicComment" label="New Public Comment" />
        <button type="button" class="btn btn-primary col" @click="handleClick">
          Save Public Comment
        </button>
        <button type="button" class="btn ms-3 btn-secondary col" @click="isAddingNewComment = false">
          Cancel
        </button>
        <!--<button type="button" class="btn btn-primary col">Add Private Comment</button>-->
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
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
