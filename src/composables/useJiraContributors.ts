import { ref } from 'vue';

import { useMemoize, watchIgnorable } from '@vueuse/core';

import type { ZodJiraContributorType } from '@/types/zodJira';
import { getJiraIssue, putJiraIssue, searchJiraUsers } from '@/services/JiraService';

import { createCatchHandler } from './service-helpers';

// Custom field ID for the contributors field in Jira.
const JIRA_CONTRIBUTORS_FIELD = 'customfield_10396';

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
      contributors.value = (data?.data?.fields[JIRA_CONTRIBUTORS_FIELD] as Partial<ZodJiraContributorType>[]) ?? [];
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
    return users?.data ?? [];
  });

  const saveContributors = async () => {
    if (!hasNewContributors.value) {
      return;
    }

    // Jira Cloud requires only { accountId } when referencing users in custom fields.
    // Fall back to { name } for on-premise Data Center compatibility.
    const contributorsPayload = contributors.value.map(c =>
      c.accountId ? { accountId: c.accountId } : { name: c.name },
    );

    return await putJiraIssue(task_key, {
      data: {
        fields: {
          [JIRA_CONTRIBUTORS_FIELD]: contributorsPayload,
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
