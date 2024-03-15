<script setup lang="ts">
import { computed, ref } from 'vue';
import LabelTextarea from '@/components/widgets/LabelTextarea.vue';
import sanitizeHtml from 'sanitize-html';
import { osimRuntime } from '@/stores/osimRuntime';

const props = defineProps<{
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

function parseGroups(serializedJson: string) {
  try {
    return JSON.parse(serializedJson.replace(/'/g, '\\"'));
  } catch (e) {
    return [];
  }
}

const transformedComments = computed(() =>
  props.comments.map((comment) => ({
    ...comment,
    meta_attr: {
      ...comment.meta_attr,
      is_private: (comment.meta_attr?.is_private || '').toLowerCase() === 'true',
      private_groups: parseGroups(comment.meta_attr?.private_groups),
    },
  })),
);

type CommentFilter = 'public' | 'private' | 'system';
type CommentActiveFilters = Record<CommentFilter, boolean>;
type CommentFilterFunctions = Record<CommentFilter, (comment: any) => boolean>;

const selectedFilters = ref<CommentActiveFilters>({
  public: true,
  private: false,
  system: false,
});

const filterFunctions: CommentFilterFunctions = {
  public: (comment: any) => !comment.meta_attr.is_private,
  private: (comment: any) => comment.meta_attr.is_private,
  system: (comment: any) => comment.meta_attr.creator === 'bugzilla@redhat.com',
};

const activeFilters = computed(() => {
  const activeFilterFunctions = Object.entries(selectedFilters.value)
    .filter(([, isActive]) => isActive)
    .map(([filter]) => filterFunctions[filter as CommentFilter]);

  return (comment: any) =>
    activeFilterFunctions.reduce(
      (result, filterFunction) => result || filterFunction(comment),
      false,
    );
});

const filteredComments = computed(() => transformedComments.value.filter(activeFilters.value));

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
    <h4 class="mt-3 mb-2">Comments</h4>
    <header class="nav">
      <button
        v-for="filter in filters"
        :key="filter"
        type="button"
        class="btn osim-comment-filter me-2"
        :class="{
          'btn-warning ': selectedFilters[filter],
          'btn-secondary': !selectedFilters[filter],
        }"
        @click="selectedFilters[filter] = !selectedFilters[filter]"
      >
        <div class="form-check form-switch">
          <input
            type="checkbox"
            class="form-check-input warning"
            :checked="selectedFilters[filter]"
          />
          {{ filter }}
        </div>
      </button>
    </header>
    <div class="row">
      <ul class="col-6">
        <li
          v-for="(comment, commentIndex) in filteredComments"
          :key="commentIndex"
          class="bg-light p-2 mt-3 rounded-2"
        >
          <p class="border-bottom pb-2">
            <span v-if="comment.meta_attr.is_private" class="badge bg-warning rounded-pill">
              Bugzilla Internal
            </span>
            {{ comment.meta_attr?.creator }} /
            <a :href="'#' + comment.type + '/' + comment.external_system_id">
              {{ comment.meta_attr?.time }}
            </a>
          </p>
          <p v-html="linkify(comment.meta_attr?.text)" />
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
  </section>
</template>

<style scoped lang="scss">
button.osim-comment-filter {
  text-transform: capitalize;
}

section.osim-comments {
  li {
    list-style-type: none;
    background-color: red;
  }
}
</style>
