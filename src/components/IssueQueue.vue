<script setup lang="ts">

</script>

<template>
  <div class="irw-content container">
    <div class="irw-incident-filter">
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
    <div class="irw-incident-list">
      <table class="table">
        <thead>
        <tr>
          <th><input type="checkbox" class="form-check-input" aria-label="Select All Issues in Table"></th>
          <th>ID</th>
          <th>Source</th>
          <th>Create_ts</th>
          <th>Title</th>
          <th>Status</th>
          <th>Assigned</th>
        </tr>
        </thead>
        <tbody class="table-group-divider">
        <tr>
          <td><input type="checkbox" class="form-check-input" aria-label="Select Issue"></td>
          <td>123456</td>
          <td>Assembler</td>
          <td>1/1/22 01:11</td>
          <td>CVE-2022-1111</td>
          <td>New</td>
          <td>Unassigned</td>
        </tr>
        <tr>
          <td><input type="checkbox" class="form-check-input" aria-label="Select Issue"></td>
          <td>234234</td>
          <td>SNOW</td>
          <td>1/2/22 01:11</td>
          <td>Code execution</td>
          <td>In progress</td>
          <td>Cloud Platform</td>
        </tr>
        <tr>
          <td><input type="checkbox" class="form-check-input" aria-label="Select Issue"></td>
          <td>123456</td>
          <td>Secalert</td>
          <td>1/3/22 01:11</td>
          <td>New CPE</td>
          <td>New</td>
          <td>unassigned</td>
        </tr>
        <tr>
          <td><input type="checkbox" class="form-check-input" aria-label="Select Issue"></td>
          <td>123456</td>
          <td>Errata</td>
          <td>5/3/22 05:11</td>
          <td>RHSA-2022</td>
          <td>To Do</td>
          <td>Platform</td>
        </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>

</style>
