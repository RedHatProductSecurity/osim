<script setup lang="ts">
import { onBeforeMount, ref } from 'vue';
import { isDefined, watchDebounced } from '@vueuse/core';
import sanitize from 'sanitize-html';
import LabelDiv from './widgets/LabelDiv.vue';
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

      <div v-if="results.length > 0" class="menu">
        <div
          v-for="contributor in results"
          :key="contributor.name"
          class="item"
          @click="add(contributor)"
        >
          <span v-html="sanitize(contributor.html)" />
        </div>
      </div>
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

  .menu {
    position: absolute;
    top: 100%;
    right: 0;
    z-index: 1000;
    display: block;
    color: #212529;
    background-color: #fff;
    border: 1px solid rgb(0 0 0 / 15%);
    border-radius: 0.25rem;
    max-height: 400px;
    overflow-y: auto;

    .item {
      display: block;
      width: 100%;
      padding: 0.25rem 1.5rem;
      clear: both;
      white-space: nowrap;
      cursor: pointer;
      font-size: .85rem;

      &:hover {
        background-color: #dee2e6;
      }
    }
  }
}

.osim-contributor-input {
  display: inline-block;
  border: none;
  outline: none;
  box-shadow: none;
}
</style>
