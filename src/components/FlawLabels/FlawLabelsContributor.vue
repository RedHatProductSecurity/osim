<script setup lang="ts">
import { ref, toValue } from 'vue';

import { useMemoize, watchDebounced } from '@vueuse/core';

import { createCatchHandler } from '@/composables/service-helpers';
import { useFlaw } from '@/composables/useFlaw';

import { useUserStore } from '@/stores/UserStore';
import type { ZodJiraUserAssignableType } from '@/types';
import { searchJiraUsers } from '@/services/JiraService';
import DropDown from '@/widgets/DropDown/DropDown.vue';
import JiraUser from '@/widgets/JiraUser/JiraUser.vue';

const modelValue = defineModel<string>();

const contributor = ref<string>(modelValue?.value ?? '');
const isLoading = ref(false);
const results = ref<ZodJiraUserAssignableType[]>([]);

const { flaw } = useFlaw();
const userStore = useUserStore();

async function selfAssign() {
  await userStore.updateJiraUsername();
  modelValue.value = userStore.jiraUsername;
  contributor.value = userStore.jiraUsername;
}

const cacheJiraUsers = useMemoize(async (query: string) => {
  if (!query || !flaw.value.task_key || contributor.value === modelValue.value) {
    return [];
  }
  isLoading.value = true;
  const users = await searchJiraUsers(query, flaw.value.task_key)
    .catch(createCatchHandler('Failed to search jira users', false));
  isLoading.value = false;
  return users?.data?.users ?? [];
});

const onQueryChange = async (query: string) => {
  if (!query.length) {
    results.value = [];
    return;
  }

  const users = await cacheJiraUsers(query);
  results.value = users ?? [];
};

const handleSuggestionClick = (user: ZodJiraUserAssignableType) => {
  contributor.value = toValue(user.name);
  modelValue.value = contributor.value;
  results.value = [];
};

watchDebounced(contributor, onQueryChange, { debounce: 300 });
</script>
<template>
  <div class="input-group input-group-sm">
    <DropDown v-if="results.length">
      <div
        v-for="user in results"
        :key="user.name"
        class="item"
        @click.prevent.stop="handleSuggestionClick(user)"
      >

        <JiraUser v-bind="user" :query="contributor" />
      </div>
    </DropDown>
    <input
      v-model="contributor"
      type="text"
      class="form-control"
      :disabled="isLoading"
    >
    <button
      type="button"
      class="btn btn-secondary osim-self-assign"
      title="Self assign"
      :disabled="isLoading"
      @click="selfAssign"
    >
      <span v-osim-loading.grow="isLoading" class="self-assign" :class="{loading: isLoading}"></span>
    </button>
  </div>
</template>

<style scoped lang="scss">
.self-assign {
  display: inline-block;
  width: 12ch;
  text-align: center;

  &:not(.loading)::before {
    content: 'Self Assign';
  }
}
</style>
