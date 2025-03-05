<script setup lang="ts">
import { computed } from 'vue';

import type { FilteredIssue } from './IssueQueue.vue';

const { issue, showLabels } = defineProps<{
  issue: FilteredIssue;
  showLabels: boolean;
}>();

// Temporarily hiding 'Source' column to avoid displaying incorrect information.
// TODO: unhide it once final issue sources are defined. [OSIDB-2424]
//       and update the CSS for the column width in IssueQueue

const nonIdFields: Exclude<keyof FilteredIssue, 'id'>[] =
  ['impact', 'formattedDate', 'title', 'workflowState', 'owner'];

const hasBadges = computed(() => issue.embargoed || (!!issue.labels?.length && showLabels));
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

const labelColorMap: { [key: string]: string } = {
  'ansible': '#FF9AFC',
  'community': '#BD9EA3',
  'devel-tools': '#FFFF9E',
  'kernel': '#72CBD7',
  'management': '#78E2B7',
  'middleware': '#FFAC74',
  'platforms': '#C39BFF',
  'special-handling': '#D8FF89',
  'cloud': '#A1CBF5',
  'openshift': '#FFD574',
  'other': '#86C770',
  'rhel': '#FF7B7B',
  'services': '#8292FF',
};

function getLabelColor(label: string, type: string): string {
  if (type === 'context_based') {
    return '#B9BCCB';
  }
  return labelColorMap[label] || '#FFFFFF';
}
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
    <td colspan="1">
      <div class="gap-1 d-flex flex-wrap">
        <span
          v-if="issue.embargoed"
          class="badge rounded-pill text-bg-danger border border-primary"
        >Embargoed</span>
        <template v-if="showLabels">
          <span
            v-for="label in sortedLabels"
            :key="label.label"
            class="badge border"
            :style="{ backgroundColor: getLabelColor(label.label, label.type) }"
            :class="{
              'text-bg-warning fw-bold border-warning': label.state == 'REQ',
              'text-black': label.state != 'REQ' && label.relevant,
              'text-decoration-line-through text-bg-gray border-secondary': !label.relevant,
            }"
            :title="label.state == 'REQ' ? 'Requested' : ''"
          >{{ label.label }}</span>
        </template>
      </div>
    </td>
    <td colspan="90%"></td>
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
