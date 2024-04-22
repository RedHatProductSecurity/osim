<script setup lang="ts">
import { DateTime } from 'luxon';
import { computed } from 'vue';

const props = defineProps<{
  issue: any;
  selected: boolean;
}>();

const nonIdFields = ['impact', 'source', 'formattedDate', 'title', 'workflowState', 'owner'];

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

defineEmits<{
  (e: 'update:selected', selected: boolean): void;
}>();

</script>

<template>
  <tr class="osim-issue-queue-item" :class="$attrs.class">
    <td :class="{ 'pb-0': hasBadges }">
      <input
        :checked="selected"
        type="checkbox"
        class="form-check-input"
        aria-label="Select Issue"
        @change="$emit('update:selected', ($event.target as HTMLInputElement).checked)"
      />
    </td>
    <td class="osim-issue-title" :class="{ 'pb-0': hasBadges }">
      <RouterLink :to="{ name: 'flaw-details', params: { id: issue.id } }">
        {{ issue.id }}
      </RouterLink>
    </td>
    <td v-for="field in nonIdFields" :key="field" :class="{ 'pb-0': hasBadges }">
      {{ issue[field] }}
    </td>
    <!--<td>{{ issue.assigned }}</td>-->
  </tr>
  <tr v-if="hasBadges" class="osim-badge-lane" :class="$attrs.class">
    <td colspan="100%" class="pt-0">
      <div class="ps-4 ms-1">
        <span v-if="isEmbargoed">
          <span class="badge rounded-pill text-bg-danger">Embargoed</span>
        </span>
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

tr.osim-issue-queue-item:has(+tr.osim-badge-lane:hover) td {
  background-color: #ffe3d9;
}
</style>
