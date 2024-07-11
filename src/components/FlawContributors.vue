<script setup lang="ts">
import { onBeforeMount, ref } from 'vue';
import { isDefined, watchDebounced } from '@vueuse/core';
import sanitize from 'sanitize-html';
import LabelDiv from './widgets/LabelDiv.vue';
import DropDown from './widgets/DropDown.vue';
import useJiraContributors from '@/composables/useJiraContributors';
import type { ZodJiraUserPickerType } from '@/types/zodJira';
import { createCatchHandler } from '@/composables/service-helpers';

const props = defineProps<{
  taskKey: string,
}>();

const inputRef = ref<HTMLInputElement | null>(null);
const query = ref<string>();
const results = ref<ZodJiraUserPickerType[]>([]);

const {
  contributors,
  isLoadingContributors,
  searchContributors,
  loadJiraContributors,
  saveContributors,
} = useJiraContributors(props.taskKey);

onBeforeMount(loadJiraContributors);

watchDebounced(query, async () => {
  if (!isDefined(query)) {
    return;
  }
  const users = await searchContributors(query.value);
  results.value = users ?? [];
}, { debounce: 500 });


const onFocus = () => {
  inputRef.value?.focus();
};

const onBlur = (event: FocusEvent) => {
  if (
    event.relatedTarget !== event.currentTarget
    && !(event.currentTarget as Node)?.contains(event.relatedTarget as Node)
  ) {
    inputRef.value?.blur();
    results.value = [];
    query.value = '';
    saveContributors().catch(createCatchHandler('Failed to save contributors', false));
  }
};

const add = (contributor: ZodJiraUserPickerType) => {
  contributors.value.push(contributor);
  query.value = '';
  results.value = [];
};

const remove = (index: number) => {
  contributors.value.splice(index, 1);
};

</script>

<template>
  <LabelDiv
    label="Contributors"
    tabindex="99"
    @click.prevent="onFocus"
    @blur.capture="onBlur"
  >
    <div class="dropdown form-control">
      <ul class="ps-0 mb-0 list-unstyled">
        <li v-for="(contributor, index) in contributors" :key="contributor.name" class="badge text-bg-secondary">
          {{ contributor.displayName }}
          <i
            class="bi bi-x-square ms-1"
            @keydown.enter.prevent="remove(index)"
            @keydown.space.prevent="remove(index)"
            @click.prevent="remove(index)"
          >
            <span class="visually-hidden">Remove</span>
          </i>
        </li>
        <li v-osim-loading.grow="isLoadingContributors">
          <input
            ref="inputRef"
            v-model="query"
            type="text"
            class="osim-contributor-input"
            @submit.prevent
            @keydown.enter.prevent
          >
        </li>
      </ul>

      <DropDown v-if="results.length > 0">
        <div
          v-for="contributor in results"
          :key="contributor.name"
          @click="add(contributor)"
        >
          <span v-html="sanitize(contributor.html)" />
        </div>
      </DropDown>
    </div>
  </LabelDiv>
</template>

<style scoped lang="scss">
.dropdown {
  position: relative;

  :deep(.spinner-grow) {
    float: right;
    position: relative;
    top: 5px;
    color: #dee2e6;
  }

  ul {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
}

.osim-contributor-input {
  display: inline-block;
  border: none;
  outline: none;
  box-shadow: none;
}
</style>
