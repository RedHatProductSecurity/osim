<script setup lang="ts">
import axios from 'axios'
import {ref} from 'vue';

const issues = ref([]);

let selectedAll = false;
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

function toggleSelectAll() {
  for (let i = 0; i < selectedIssues.length; i++) {
    selectedIssues[i] = selectedAll;
  }
}

const selectedIssues = mockIssues.map(() => false);

axios.get('http://127.0.0.1:4010/osidb/api/v1/flaws?bz_id=999.1777106091507&changed_after=2016-05-25T04%3A00%3A00.0Z&changed_before=1953-04-15T05%3A00%3A00.0Z&created_dt=1997-02-22T05%3A00%3A00.0Z&cve_id=suscipit,quia,dignissimos&cvss2=nobis&cvss2_score=-3.12820402011057e%2B38&cvss3=nam&cvss3_score=2.2240193839647933e%2B38&cwe_id=reprehenderit&description=sed&embargoed=false&exclude_fields=pariatur&flaw_meta_type=enim,sed,enim&impact=LOW&include_fields=et,quisquam,sunt,aut&include_meta_attr=ullam,libero,at,alias&reported_dt=1972-11-30T00%3A00%3A00.0Z&resolution=DUPLICATE&search=unde&source=PHP&state=NEW&statement=sunt&summary=maiores&title=reprehenderit&tracker_ids=eum,cum,at,odio,a&type=WEAKNESS&unembargo_dt=1949-12-22T00%3A00%3A00.0Z&updated_dt=1973-03-16T05%3A00%3A00.0Z&uuid=c605cdc8-0f63-c5ec-d32d-75c184147eba')
    .then(response => {
      console.log('axios got: ', response.data);

    })
    .catch(err => {
      console.error('axios error: ', err);
    })

</script>

<template>
  <div class="osim-content container">
    <div class="osim-incident-filter">
      <label>
        Filter By
        <select>
          <option value="Issues assigned to Me">Issues assigned to Me</option>
          <option value="Issues assigned to team but unowned">Issues assigned to team but unowned</option>
          <option value="Oldest">Oldest</option>
          <option value="Newest">Newest</option>
        </select>
      </label>
    </div>
    <div class="osim-incident-list">
      <table class="table">
        <thead>
        <tr>
          <th><input type="checkbox" @click="toggleSelectAll(selectedAll)" v-model="selectedAll" class="form-check-input" aria-label="Select All Issues in Table"></th>
          <th>ID</th>
          <th>Source</th>
          <th>Create_ts</th>
          <th>Title</th>
          <th>Status</th>
          <th>Assigned</th>
        </tr>
        </thead>
        <tbody class="table-group-divider">
        <tr v-for="(issue, index) of mockIssues">
          <td><input type="checkbox" v-model="selectedIssues[index]" class="form-check-input" aria-label="Select Issue"></td>
          <td><RouterLink to="/issue-details">{{ issue.id }}</RouterLink></td>
          <td>{{ issue.source }}</td>
          <td>{{ issue.create_ts }}</td>
          <td>{{ issue.title }}</td>
          <td>{{ issue.status }}</td>
          <td>{{ issue.assigned }}</td>
        </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>

</style>
