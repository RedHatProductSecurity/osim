<script setup lang="ts">
import { DateTime } from 'luxon';
import { computed } from 'vue';

const props = defineProps<{
  issue: any,
  selected: boolean,
}>();

const isEmbargoed = computed(() => DateTime.fromISO(props.issue.unembargo_dt).diffNow().milliseconds > 0);
const hasBadges = computed(() => isEmbargoed.value);

defineEmits<{
  (e: 'update:selected', selected: boolean): void;
}>();
// console.log('IssueQueueItem:', props.issue);

</script>

<template>
  <tr class="osim-issue-queue-item" :class="$attrs.class">
    <td><input :checked="selected" @change="$emit('update:selected', ($event.target as HTMLInputElement).checked)" type="checkbox" class="form-check-input" aria-label="Select Issue"></td>
    <td>
      <RouterLink :to="{name: 'flaw-details', params: {id: issue.uuid}}">{{ issue.cve_id || issue.uuid }}</RouterLink>

    </td>
    <td>{{ issue.impact }}</td>
    <td>{{ issue.source }}</td>
    <td>{{ issue.created_dt }}</td>
    <td>{{ issue.title }}</td>
    <td>{{ issue.state }}</td>
    <td>{{ issue.owner }}</td>
    <!--<td>{{ issue.assigned }}</td>-->
  </tr>
  <tr class="osim-badge-gutter" :class="$attrs.class" v-if="hasBadges">
    <td colspan="100%" >
    <div  class="ps-4">
      <span v-if="isEmbargoed">
        <span class="badge rounded-pill text-bg-danger">Embargoed</span>
      </span>
    </div>
      </td>
  </tr>
</template>

<style lang="scss" scoped>
@import "@/scss/bootstap-overrides.scss";

tr td {
  border: 0;
}

tr.osim-shaded td {
  background-color: $light-gray;
}

</style>
