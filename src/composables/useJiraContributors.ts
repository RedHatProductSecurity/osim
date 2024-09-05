import { ref } from 'vue';

import { useMemoize, watchIgnorable } from '@vueuse/core';

import type { ZodJiraContributorType } from '@/types/zodJira';
import { getJiraIssue, putJiraIssue, searchJiraUsers } from '@/services/JiraService';

import { createCatchHandler } from './service-helpers';

export default function useJiraContributors(task_key: string) {
  const contributors = ref<Partial<ZodJiraContributorType>[]>([]);
  const hasNewContributors = ref(false);
  const isLoadingContributors = ref(false);

  const { ignoreUpdates } = watchIgnorable(contributors, () => {
    hasNewContributors.value = true;
  }, { deep: true });

  const loadJiraContributors = async () => {
    isLoadingContributors.value = true;

    const data = await getJiraIssue(task_key)
      .catch(createCatchHandler('Failed to load contributors', false));

    ignoreUpdates(() => {
      contributors.value = data?.data?.fields.customfield_12315950 ?? [];
    });
    isLoadingContributors.value = false;
  };

  const searchContributors = useMemoize(async (query: string) => {
    if (!query) {
      return [];
    }
    isLoadingContributors.value = true;
    const users = await searchJiraUsers(query, task_key)
      .catch(createCatchHandler('Failed to search contributors', false));
    isLoadingContributors.value = false;
    return users?.data?.users ?? [];
  });

  const saveContributors = async () => {
    if (!hasNewContributors.value) {
      return;
    }

    return await putJiraIssue(task_key, {
      data: {
        fields: {
          customfield_12315950: contributors.value,
        },
      },
    });
  };

  return {
    contributors,
    hasNewContributors,
    isLoadingContributors,
    loadJiraContributors,
    searchContributors,
    saveContributors,

  };
}
