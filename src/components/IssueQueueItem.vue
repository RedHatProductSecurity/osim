<script setup lang="ts">
import { DateTime } from 'luxon';
import { computed } from 'vue';

const props = defineProps<{
  issue: any,
  selected: boolean,
}>();

const isUnembargoDateScheduledForLater = computed(
  () => DateTime.fromISO(props.issue.unembargo_dt).diffNow().milliseconds > 0,
);

const isEmbargoedButNotScheduled = computed(
  () => props.issue.embargoed && !props.issue.unembargo_dt,
);

const isEmbargoed = computed(
  () => isUnembargoDateScheduledForLater.value || isEmbargoedButNotScheduled.value,
);

const hasBadges = computed(() => isEmbargoed.value);

const formattedDate = computed(() =>
  DateTime.fromISO(props.issue.created_dt).toFormat('yyyy-MM-dd'),
);

defineEmits<{
  (e: 'update:selected', selected: boolean): void;
}>();
// console.log('IssueQueueItem:', props.issue);

</script>

<template>
  <tr class="osim-issue-queue-item" :class="$attrs.class">
    <td><input
      :checked="selected"
      type="checkbox"
      class="form-check-input"
      aria-label="Select Issue"
      @change="$emit('update:selected', ($event.target as HTMLInputElement).checked)"
    ></td>
    <td class="osim-issue-title">
      <RouterLink :to="{name: 'flaw-details', params: {id: issue.uuid}}">
        {{ issue.cve_id || issue.uuid }}
      </RouterLink>

    </td>
    <td>{{ issue.impact }}</td>
    <td>{{ issue.source }}</td>
    <td>{{ formattedDate }}</td>
    <td>{{ issue.title }}</td>
    <td>{{ issue.state }}</td>
    <td>{{ issue.owner }}</td>
    <!--<td>{{ issue.assigned }}</td>-->
  </tr>
  <tr v-if="hasBadges" class="osim-badge-gutter" :class="$attrs.class">
    <td colspan="100%">
      <div class="ps-4">
        <span v-if="isEmbargoed">
          <span class="badge rounded-pill text-bg-danger">Embargoed</span>
        </span>
      </div>
    </td>
  </tr>
</template>

<style lang="scss" scoped>
@import "@/scss/bootstrap-overrides.scss";

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

</style>
