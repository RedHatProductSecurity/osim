<script setup lang="ts">
import { nextTick, computed, ref, toValue } from 'vue';

import { useMemoize } from '@vueuse/core';

import { createCatchHandler } from '@/composables/service-helpers';

import { searchJiraUsers } from '@/services/JiraService';
import { useUserStore } from '@/stores/UserStore';
import type { ZodJiraUserAssignableType } from '@/types/zodJira';
import LabelDiv from '@/widgets/LabelDiv/LabelDiv.vue';
import EditableTextWithSuggestions from '@/widgets/EditableTextWithSuggestions/EditableTextWithSuggestions.vue';
import JiraUser from '@/widgets/JiraUser/JiraUser.vue';

const props = defineProps<{
  taskKey?: null | string;
}>();
const owner = defineModel<null | string>({ default: null });
const userStore = useUserStore();

async function selfAssign() {
  isLoading.value = true;
  return userStore.updateJiraUsername().then(() => {
    if (userStore.jiraUsername !== '') {
      owner.value = userStore.jiraUsername;
    }
  }).finally(() => {
    isLoading.value = false;
  });
}

async function handleClick(fn: (arg?: any) => any) {
  await selfAssign();
  nextTick(fn);
}

const isAssignedToMe = computed(() =>
  owner.value === userStore.jiraUsername && userStore.jiraUsername !== '',
);

const isLoading = ref(false);
const queryRef = ref('');
const results = ref<ZodJiraUserAssignableType[]>([]);

const cacheJiraUsers = useMemoize(async (query: string) => {
  if (!query || !props.taskKey) {
    return [];
  }
  isLoading.value = true;
  const users = await searchJiraUsers(query, props.taskKey)
    .catch(createCatchHandler('Failed to search jira users', false));
  isLoading.value = false;
  return users?.data?.users ?? [];
});

const onQueryChange = async (query: string) => {
  const users = await cacheJiraUsers(query);
  results.value = users ?? [];
  queryRef.value = query;
};

const handleSuggestionClick = (fn: (args?: any) => void, user: ZodJiraUserAssignableType) => {
  owner.value = toValue(user.name);
  results.value = [];
  nextTick(fn);
};
</script>

<template>
  <LabelDiv label="Owner" :loading="isLoading" class="mb-2">
    <EditableTextWithSuggestions v-model="owner" class="col-12" @update:query="onQueryChange">
      <template v-if="!isAssignedToMe" #buttons-out-of-editing-mode="{ onBlur }">
        <button
          type="button"
          class="btn btn-primary osim-self-assign"
          :disabled="isLoading"
          @click.prevent.stop="handleClick(onBlur)"
        >
          Self Assign
        </button>
      </template>
      <template v-if="!isAssignedToMe" #buttons-in-editing-mode="{ onBlur }">
        <button
          type="button"
          class="btn btn-primary osim-self-assign"
          :disabled="isLoading"
          @click.prevent.stop="handleClick(onBlur)"
        >
          Self Assign
        </button>
      </template>
      <template v-if="results.length > 0" #suggestions="{ abort }">
        <div
          v-for="user in results"
          :key="user.name"
          class="item"
          @click.prevent.stop="handleSuggestionClick(abort, user)"
        >

          <JiraUser v-bind="user" :query="queryRef" />
        </div>
      </template>
    </EditableTextWithSuggestions>
  </LabelDiv>
</template>
