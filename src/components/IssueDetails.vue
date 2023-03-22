<script setup lang="ts">

</script>

<template>
  <div class="osim-content container">
    <div class="row">
      <ul class="nav nav-tabs">
        <li class="nav-item"><a href="#" class="nav-link active" aria-current="page">Issue Details</a></li>
        <li class="nav-item"><a href="#" class="nav-link">Raw View</a></li>
      </ul>
    </div>

    <div class="row">
      <div class="col">
        <div class="row">
          <div class="col-4 osim-detail-id-group">
            <div class="osim-detail-id">ID: 123456</div>
            <div class="osim-detail-status">Status: New</div>
            <div class="osim-detail-source">Source: SNOW</div>
          </div>
          <div class="col-4 osim-detail-ts-group">
            <div class="osim-detail-create-ts">Create_ts: 1/2/23 01:11</div>
            <div class="osim-detail-last-update-ts">Last_update_ts: 1/2/23 01:11</div>
          </div>
          <div class="col-4 osim-detail-assigned-group">
            <div class="osim-detail-assigned-to">Assigned To: Cloud Platform</div>
            <div class="osim-detail-assigned-person">Assigned Person: Nick</div>
          </div>
        </div>
        <div class="row">
          <div class="osim-detail-title">Title: Question about CVE-2023-123456</div>
        </div>
        <div class="row">
          <div class="osim-detail-reported-by">Reported By: Stefan</div>
        </div>

        <div class="row osim-detail-issue-description">
          <div>
            <label for="issueDescription">Issue Description</label>
            <textarea class="form-control" name="issue-description" id="issueDescription" cols="30"
                      rows="10"></textarea>
          </div>
        </div>
      </div>
      <div class="col-2 d-grid gap-2">
        <button class="btn btn-primary">Customer Pending</button>
        <button class="btn btn-primary">Close this issue without actions</button>
        <button class="btn btn-primary">Move this issue to another source queue</button>
        <button class="btn btn-primary">Create a flaw</button>
        <button class="btn btn-primary">Create hardening bug/weakness</button>
        <button class="btn btn-primary">Save</button>
      </div>
    </div>


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
