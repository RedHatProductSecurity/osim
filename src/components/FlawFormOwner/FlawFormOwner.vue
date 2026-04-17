<script setup lang="ts">
import { nextTick, computed, ref } from 'vue';

import { useMemoize } from '@vueuse/core';

import { createCatchHandler } from '@/composables/service-helpers';

import { searchJiraUsers } from '@/services/JiraService';
import { useToastStore } from '@/stores/ToastStore';
import { useUserStore } from '@/stores/UserStore';
import type { ZodJiraUserAssignableType } from '@/types/zodJira';
import LabelDiv from '@/widgets/LabelDiv/LabelDiv.vue';
import EditableTextWithSuggestions from '@/widgets/EditableTextWithSuggestions/EditableTextWithSuggestions.vue';
import JiraUser from '@/widgets/JiraUser/JiraUser.vue';

const props = defineProps<{
  error?: null | string;
  taskKey?: null | string;
}>();
const owner = defineModel<null | string>({ default: null });
const userStore = useUserStore();
const { addToast } = useToastStore();

function selfAssign(onComplete?: () => void) {
  if (userStore.userEmail) {
    owner.value = userStore.userEmail;
  }
  if (onComplete) nextTick(onComplete);
}

const isAssignedToMe = computed(() =>
  owner.value === userStore.userEmail && userStore.userEmail !== '',
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
  return users?.data ?? [];
});

const onQueryChange = async (query: string) => {
  const users = await cacheJiraUsers(query);
  results.value = users ?? [];
  queryRef.value = query;
};

function handleSuggestionClick(closeSuggestions: () => void, user: ZodJiraUserAssignableType) {
  const email = user.emailAddress?.trim();
  if (!email) {
    addToast({
      title: 'Cannot assign owner',
      body: 'This Jira user has no visible email address. Choose another user or enter an email manually.',
      css: 'warning',
    });
    nextTick(closeSuggestions);
    return;
  }
  owner.value = email;
  results.value = [];
  nextTick(closeSuggestions);
}
</script>

<template>
  <LabelDiv label="Owner" :loading="isLoading" class="mb-2">
    <EditableTextWithSuggestions
      v-model="owner"
      class="col-12"
      :error="error"
      @update:query="onQueryChange"
    >
      <template v-if="!isAssignedToMe" #buttons-out-of-editing-mode="{ onBlur }">
        <button
          type="button"
          class="btn btn-primary osim-self-assign"
          :disabled="isLoading"
          @click.prevent.stop="selfAssign(() => onBlur(null))"
        >
          Self Assign
        </button>
      </template>
      <template v-if="!isAssignedToMe" #buttons-in-editing-mode="{ onBlur }">
        <button
          type="button"
          class="btn btn-primary osim-self-assign"
          :disabled="isLoading"
          @click.prevent.stop="selfAssign(() => onBlur(null))"
        >
          Self Assign
        </button>
      </template>
      <template v-if="results.length > 0" #suggestions="{ abort }">
        <div
          v-for="user in results"
          :key="user.accountId ?? user.name ?? undefined"
          class="item"
          @click.prevent.stop="handleSuggestionClick(abort, user)"
        >

          <JiraUser v-bind="user" :query="queryRef" />
        </div>
      </template>
    </EditableTextWithSuggestions>
  </LabelDiv>
</template>
