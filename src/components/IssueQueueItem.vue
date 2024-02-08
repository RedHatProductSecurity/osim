<script setup lang="ts">
import { DateTime } from 'luxon';

const props = defineProps<{
  issue: any,
  selected: boolean,
}>();

defineEmits<{
  (e: 'update:selected', selected: boolean): void;
}>();
// console.log('IssueQueueItem:', props.issue);

</script>

<template>
  <tr class="osim-issue-queue-item">
    <td><input :checked="selected" @change="$emit('update:selected', ($event.target as HTMLInputElement).checked)" type="checkbox" class="form-check-input" aria-label="Select Issue"></td>
    <td>
      <RouterLink :to="{name: 'flaw-details', params: {id: issue.uuid}}">{{ issue.cve_id || issue.uuid }}</RouterLink>
      <div v-if="issue.unembargo_dt">
        <span v-if="DateTime.fromISO(issue.unembargo_dt).diffNow().milliseconds > 0">
          <span class="badge rounded-pill text-bg-danger">Embargoed</span>
        </span>
      </div>
    </td>
    <td>{{ issue.impact }}</td>
    <td>{{ issue.source }}</td>
    <td>{{ issue.created_dt }}</td>
    <td>{{ issue.title }}</td>
    <td>{{ issue.state }}</td>
    <td>{{ issue.owner }}</td>
    <!--<td>{{ issue.assigned }}</td>-->
  </tr>
</template>

<style scoped>

</style>
