<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  issue: any;
}>();

// Temporarily hiding 'Source' column to avoid displaying incorrect information.
// TODO: unhide it once final issue sources are defined. [OSIDB-2424]
//       and update the CSS for the column width in IssueQueue
// const nonIdFields = ['impact', 'source', 'formattedDate', 'title', 'workflowState', 'owner'];
const nonIdFields = ['impact', 'formattedDate', 'title', 'workflowState', 'owner'];

const isEmbargoed = computed(() => props.issue.embargoed);
</script>

<template>
  <tr class="osim-issue-queue-item" :class="$attrs.class">
    <td class="osim-issue-title" :class="{ 'pb-0': isEmbargoed }">
      <RouterLink :to="{ name: 'flaw-details', params: { id: issue.id } }">
        {{ issue.id }}
      </RouterLink>
    </td>
    <td v-for="field in nonIdFields" :key="field" :class="{ 'pb-0': isEmbargoed }">
      {{ issue[field] }}
    </td>
    <!--<td>{{ issue.assigned }}</td>-->
  </tr>
  <tr v-if="isEmbargoed" class="osim-badge-lane" :class="$attrs.class">
    <td colspan="100%" class="pt-0">
      <span v-if="isEmbargoed">
        <span class="badge rounded-pill text-bg-danger">Embargoed</span>
      </span>
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

tr.osim-issue-queue-item:has(+tr.osim-badge-lane:hover) td {
  background-color: #ffe3d9;
}
</style>
