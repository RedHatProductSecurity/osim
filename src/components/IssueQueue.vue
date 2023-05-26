<script setup lang="ts">
import {computed, onMounted, reactive, ref} from 'vue';
import {getFlaws} from '@/services/FlawService'



const issues = ref([]);

let issueFilter = ref('');
let filteredIssues = computed<any>(() => {
  if (issueFilter.value.length === 0) {
    return issues.value;
  }
  const filterCaseInsensitive = issueFilter.value.toLowerCase();
  return issues.value.filter((issue: any) => {
    // return [issue.title, issue.cve_id, issue.state, issue.source].join(' ').toLowerCase().includes(issueFilter.value.toLowerCase());
    return [issue.title, issue.cve_id, issue.state, issue.source].some(text => text && text.toLowerCase().includes(filterCaseInsensitive));
  });
});

const mockIssues = [
  {
    id: '123456',
    source: 'Assembler',
    create_ts: '1/1/22 01:11',
    title: 'CVE-2022-1111',
    status: 'New',
    assigned: 'Unassigned',
  },
  {
    id: '234234',
    source: 'SNOW',
    create_ts: '1/1/22 01:1/2/22 01:11',
    title: 'CVE-2022-Code execution',
    status: 'In progress',
    assigned: 'Cloud Platform',
  },
  {
    id: '123456',
    source: 'Secalert',
    create_ts: '1/3/22 01:11',
    title: 'New CPE',
    status: 'New',
    assigned: 'unassigned',
  },
  {
    id: '123456',
    source: 'Errata',
    create_ts: '5/3/22 05:11',
    title: 'RHSA-2022',
    status: 'To Do',
    assigned: 'Platform',
  },
]

function toggleSelectAll(selectedAll: boolean) {
  selectedIssues.push()
  for (let i = 0; i < selectedIssues.length; i++) {
    selectedIssues[i] = selectedAll;
  }
}

let isSelectAllIndeterminate = computed(() => {
  return selectedIssues.some(
      (it) => it !== selectedIssues[0]
  )
})
let isSelectAllChecked = computed(() => {
  return selectedIssues.every(it => it);
})

let selectedIssues = reactive<boolean[]>(filteredIssues.value.map(() => false));

onMounted(() => {
  getFlaws()
      .then(response => {
        console.log('axios got: ', response.data);
        issues.value = response.data.results;

      })
      .catch(err => {
        console.error('axios error: ', err);
      })

})


</script>

<template>
  <div class="osim-content container">
    <div class="osim-incident-filter">
      <label>
        <!--Filter By-->
        <!--<select>-->
        <!--  <option value="Issues assigned to Me">Issues assigned to Me</option>-->
        <!--  <option value="Issues assigned to team but unowned">Issues assigned to team but unowned</option>-->
        <!--  <option value="Oldest">Oldest</option>-->
        <!--  <option value="Newest">Newest</option>-->
        <!--</select>-->

        <input type="text" v-model="issueFilter" class="form-text form-control" placeholder="Filter Issues/Flaws"/>
      </label>
    </div>
    <div class="osim-incident-list">
      <table class="table">
        <thead>
        <tr>
          <th><input type="checkbox"
                     :indeterminate="isSelectAllIndeterminate"
                     :checked="isSelectAllChecked"
                     @input="toggleSelectAll(($event.target as HTMLInputElement).checked)"
                     aria-label="Select All Issues in Table">
          </th>
          <th>ID</th>
          <th>Source</th>
          <th>created_dt</th>
          <th>Title</th>
          <th>State</th>
          <th>Assigned</th>
        </tr>
        </thead>
        <tbody class="table-group-divider">
        <tr v-for="(issue, index) of filteredIssues">
          <td><input type="checkbox" v-model="selectedIssues[index]" class="form-check-input" aria-label="Select Issue">
          </td>
          <td>
            <RouterLink :to="{name: 'flaw-details', params: {id: issue.uuid}}">{{ issue.cve_id }}</RouterLink>
          </td>
          <td>{{ issue.source }}</td>
          <td>{{ issue.created_dt }}</td>
          <td>{{ issue.title }}</td>
          <td>{{ issue.state }}</td>
          <td>{{ issue.assigned }}</td>
        </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>

</style>
