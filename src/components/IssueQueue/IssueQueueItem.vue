<script setup lang="ts">
import { computed } from 'vue';

import { useToggle } from '@vueuse/core';

import type { FilteredIssue } from './IssueQueue.vue';

const { issue } = defineProps<{
  issue: FilteredIssue;
}>();

// Temporarily hiding 'Source' column to avoid displaying incorrect information.
// TODO: unhide it once final issue sources are defined. [OSIDB-2424]
//       and update the CSS for the column width in IssueQueue

const nonIdFields: Exclude<keyof FilteredIssue, 'id'>[] =
  ['impact', 'formattedDate', 'title', 'workflowState', 'owner'];

const hasBadges = computed(() => issue.embargoed || !!issue.labels?.length);
const truncatedLabelCount = 4;
const [showLabels, toggleShowLabels] = useToggle();
const sortedLabels = computed(() => issue.labels?.toSorted((a, b) => {
  if (
    (a.state === 'REQ' && b.state !== 'REQ')
    || (a.contributor && !b.contributor)
  ) {
    return -1;
  }
  if (
    (a.state !== 'REQ' && b.state === 'REQ')
    || (!a.contributor && b.contributor)
  ) {
    return 1;
  }

  return a.label.localeCompare(b.label);
}) ?? []);
const truncatedLabels = computed(
  () => showLabels.value ? sortedLabels.value : sortedLabels.value?.slice(0, truncatedLabelCount),
);
</script>

<template>
  <tr
    class="osim-issue-queue-item"
    :class="$attrs.class"
  >
    <td
      class="osim-issue-title"
      :class="{ 'pb-0': hasBadges }"
    >
      <RouterLink :to="{ name: 'flaw-details', params: { id: issue.id } }">
        {{ issue.id }}
      </RouterLink>
    </td>
    <td
      v-for="field in nonIdFields"
      :key="field"
      :class="{ 'pb-0': hasBadges }"
    >
      {{ issue[field] }}
    </td>
    <!--<td>{{ issue.assigned }}</td>-->
  </tr>
  <tr
    v-if="hasBadges"
    class="osim-badge-lane"
    :class="$attrs.class"
  >
    <td colspan="100%">
      <div class="gap-1 d-flex">
        <span
          v-if="issue.embargoed"
          class="badge rounded-pill text-bg-danger border border-primary"
        >Embargoed</span>
        <span
          v-for="label in truncatedLabels"
          :key="label.label"
          class="badge rounded-pill text-capitalize border"
          :class="{
            'text-bg-warning fw-bold border-warning': label.state == 'REQ',
            'text-bg-light-info border-info': label.state != 'REQ' && label.relevant,
            'text-decoration-line-through text-bg-gray border-secondary': !label.relevant,
          }"
          :title="label.state == 'REQ' ? 'Requested' : ''"
        >{{ label.label }}</span>
        <i
          v-if="(issue.labels?.length ?? 0) > truncatedLabelCount"
          class="bi pe-1 cursor-pointer osim-show-all-labels"
          :class="[showLabels ? 'bi-caret-left-fill' : 'bi-caret-right-fill']"
          title="Show all labels"
          @click="toggleShowLabels()"
        />
      </div>
    </td>
  </tr>
</template>

<style lang="scss" scoped>
@import '@/scss/bootstrap-overrides';

td.osim-issue-title {
  max-width: 10rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

tr td {
  border: 0;
}

tr.osim-shaded td {
  background-color: $light-gray;
}

tr:hover {
  td {
    background-color: #ffe3d9;
  }

  &.osim-issue-queue-item + tr.osim-badge-lane td {
    background-color: #ffe3d9;
  }
}

tr.osim-issue-queue-item:has(+ tr.osim-badge-lane:hover) td {
  background-color: #ffe3d9;
}

.osim-badge-lane {
  .osim-show-all-labels {
    cursor: pointer;
  }
}
</style>
