<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute } from 'vue-router';
import { z } from 'zod';
import { searchFlaws } from '../services/FlawService';
import IssueQueueItem from '../components/IssueQueueItem.vue';
import IssueSearchAdvanced from '../components/IssueSearchAdvanced.vue';

type FilteredIssue = {
  issue: any;
  selected: boolean;
};

const route = useRoute();

const issues = ref([]);

let issueFilter = ref('');

let filteredIssues = computed<FilteredIssue[]>(() => {
  if (issueFilter.value.length === 0) {
    return issues.value.map((issue) =>
      reactive({ issue: issue, selected: false })
    );
  }
  const filterCaseInsensitive = issueFilter.value.toLowerCase();
  return issues.value
    .filter((issue: any) => {
      // return [issue.title, issue.cve_id, issue.state, issue.source].join(' ').toLowerCase().includes(issueFilter.value.toLowerCase());
      return [issue.title, issue.cve_id, issue.state, issue.source].some(
        (text) => text && text.toLowerCase().includes(filterCaseInsensitive)
      );
    })
    .map((issue) => reactive({ issue: issue, selected: false }));
});

function updateSelectAll(selectedAll: boolean) {
  for (let filteredIssue of filteredIssues.value) {
    filteredIssue.selected = selectedAll;
  }
}

let isSelectAllIndeterminate = computed(() => {
  if (filteredIssues.value.length === 0) {
    return false;
  }
  return filteredIssues.value.some(
    (it) => it.selected !== filteredIssues.value[0].selected
  );
});

let isSelectAllChecked = computed(() => {
  return filteredIssues.value.every((it) => it.selected);
});

const searchQuery = z.object({
  query: z.object({
    query: z.string(),
  }),
});

onMounted(() => {
  try {
    const parsedRoute = searchQuery.parse(route);
    if (parsedRoute.query.query === '') {
      // TODO handle error
      return;
    }
    searchFlaws(parsedRoute.query.query)
      .then((response) => setIssues(response.results))
      .catch(console.error);
  } catch (e) {
    console.log('IssueSearch: error advanced searching', e);
  }
});

function setIssues(loadedIssues: []) {
  issues.value = loadedIssues;
}
</script>

<template>
  <div class="osim-content container">
    <div class="osim-incident-filter">
      <div class="col-lg-6 col-md-8 mt-2">
        <IssueSearchAdvanced :setIssues="setIssues" />
      </div>
      <hr/>
      <label>
        <!--Filter By-->
        <!--<select>-->
        <!--  <option value="Issues assigned to Me">Issues assigned to Me</option>-->
        <!--  <option value="Issues assigned to team but unowned">Issues assigned to team but unowned</option>-->
        <!--  <option value="Oldest">Oldest</option>-->
        <!--  <option value="Newest">Newest</option>-->
        <!--</select>-->

        <input
          type="text"
          v-model="issueFilter"
          class="form-text form-control"
          placeholder="Filter Issues/Flaws"
        />
      </label>
    </div>
    <div class="osim-incident-list">
      <table class="table">
        <thead>
          <tr>
            <th>
              <input
                type="checkbox"
                :indeterminate="isSelectAllIndeterminate"
                :checked="isSelectAllChecked"
                @change="updateSelectAll(($event.target as HTMLInputElement).checked)"
                aria-label="Select All Issues in Table"
              />
            </th>
            <th>ID</th>
            <th>Impact</th>
            <th>Source</th>
            <th>created_dt</th>
            <th>Title</th>
            <th>State</th>
            <!--<th>Assigned</th>-->
          </tr>
        </thead>
        <tbody class="table-group-divider">
          <template v-for="filteredIssue of filteredIssues">
            <IssueQueueItem
              :issue="filteredIssue.issue"
              v-model:selected="filteredIssue.selected"
            />
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped></style>
