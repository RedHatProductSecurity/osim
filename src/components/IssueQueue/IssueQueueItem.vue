<script setup lang="ts">
import { computed } from 'vue';

import UnprocessedFlawLabel from '@/components/UnprocessedFlawLabel/UnprocessedFlawLabel.vue';

import { useUnprocessedFlawDetection } from '@/composables/unprocessedFlawCheck';

import { labelColorMap } from '@/constants';

import type { FilteredIssue } from './IssueQueue.vue';

const { issue, showLabels } = defineProps<{
  issue: FilteredIssue;
  showLabels: boolean;
}>();

// Temporarily hiding 'Source' column to avoid displaying incorrect information.
// TODO: unhide it once final issue sources are defined. [OSIDB-2424]
//       and update the CSS for the column width in IssueQueue

const nonIdFields: Exclude<keyof FilteredIssue, 'cve_id' | 'uuid'>[] =
  ['impact', 'formattedDate', 'title', 'classification', 'owner'];

const { isFlawUnprocessed } = useUnprocessedFlawDetection();

const hasBadges = computed(() =>
  issue.embargoed
  || (showLabels && (!!issue.labels?.length || isFlawUnprocessed(issue))),
);
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

function hashLabelColor(label: string): string {
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = label.charCodeAt(i) + ((hash << 5) - hash);
  }
  return `hsl(${Math.abs(hash) % 360}, 55%, 82%)`;
}

function getLabelColor(label: string, type: string): string {
  if (type === 'context_based') {
    return '#B9BCCB';
  }
  if (type === 'bu') {
    return hashLabelColor(label);
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
      <RouterLink :to="{ name: 'flaw-details', params: { id: issue.cve_id || issue.uuid } }">
        {{ issue.cve_id || issue.uuid }}
      </RouterLink>
    </td>
    <td
      v-for="field in nonIdFields"
      :key="field"
      :class="{ 'pb-0': hasBadges }"
    >
      {{ field === 'classification' ? issue[field]?.state : issue[field] }}
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
          <UnprocessedFlawLabel v-if="isFlawUnprocessed(issue)" :flaw="issue" variant="badge" />
          <template
            v-for="label in sortedLabels"
            :key="label.label"
          >
            <span
              v-if="!label.contributor"
              :style="{ backgroundColor: getLabelColor(label.label, label.type) }"
              class="badge rounded-pill border"
              :class="{
                'text-bg-warning fw-bold border-warning': label.state == 'REQ',
                'text-black': label.state != 'REQ' && label.relevant,
                'text-decoration-line-through text-bg-gray border-secondary': !label.relevant,
              }"
              :title="label.state === 'REQ' ? 'Requested' : ''"
            >{{ label.label }}</span>
          </template>
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
