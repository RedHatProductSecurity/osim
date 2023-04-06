<script setup lang="ts">
import type {Flaw} from '@/generated-client';
import moment from 'moment';

defineProps<{
  flaw: Flaw
}>();
</script>

<template>
  <div class="osim-content container">
    <!--<div class="row">-->
    <!--  <ul class="nav nav-tabs">-->
    <!--    <li class="nav-item"><a href="#" class="nav-link active" aria-current="page">Issue Details</a></li>-->
    <!--    <li class="nav-item"><a href="#" class="nav-link">Raw View</a></li>-->
    <!--  </ul>-->
    <!--</div>-->

    <div class="row">
      <h2 class="mt-3 mb-2">{{ flaw.title }}</h2>
      <div class="col">
        <div class="row">
          <div class="col-6">
            <!--<div>UUID: {{ flaw.uuid }}</div>-->
            <div>Type: {{ flaw.type }}</div>
            <div>CVE ID: {{ flaw.cve_id }}</div>
            <div>Flaw source: {{ flaw.source }}</div>
            <div>State: {{ flaw.state }}</div>
            <div>Resolution: {{ flaw.resolution }}</div>
            <div>Impact: {{ flaw.impact }}</div>
            <div v-if="flaw.cwe_id">CWE: {{ flaw.cwe_id }}</div>
            <div v-if="flaw.cvss2 || flaw.cvss2_score || flaw.nvd_cvss2">
              <div><span>CVSS2: {{ flaw.cvss2 }}</span> <span>{{ flaw.cvss2_score }}</span></div>
              <div v-if="flaw.nvd_cvss2"><span>NVD CVSS2: {{ flaw.nvd_cvss2 }}</span></div>
            </div>
            <div v-if="flaw.cvss3 || flaw.cvss3_score || flaw.nvd_cvss3">
              <div><span>CVSS3: {{ flaw.cvss3 }}</span> <span>{{ flaw.cvss3_score }}</span></div>
              <div v-if="flaw.nvd_cvss3"><span>NVD CVSS3: {{ flaw.nvd_cvss3 }}</span></div>
            </div>
          </div>
          <div class="col-6 text-end">
            <div>Major Incident: {{ flaw.is_major_incident ? 'YES' : 'No' }}</div>
            <div>Reported date: {{ flaw.reported_dt }}</div>
            <div v-if="flaw.unembargo_dt">Unembargo date <span v-if="moment(flaw.unembargo_dt).isAfter(moment())">[FUTURE]</span>:
              {{ flaw.unembargo_dt }}
            </div>
            <div>
              <div v-if="flaw.trackers && flaw.trackers.length > 0">Trackers:</div>
              <div v-for="tracker in flaw.trackers">{{ tracker }}</div>
            </div>
          </div>
        </div>
        <div class="row">
          <h3 v-if="flaw.affects">Affected Offerings</h3>
          <div class="row affected-offering" v-for="affect in flaw.affects">
            <div class="col-9">
              <div class="affected-module-component">
                Affected Module / Component: {{ affect.ps_module }} / {{ affect.ps_component }}
              </div>
              <div>Type: {{ affect.type }}</div>
              <div v-if="affect.external_system_id">External ID: {{ affect.external_system_id }}</div>
              <div>Affectedness: {{ affect.affectedness }}</div>
              <div>Resolution: {{ affect.resolution }}</div>
              <div>Impact: {{ affect.impact }}</div>
              <div v-if="affect.cvss2 || affect.cvss2_score || affect.nvd_cvss2">
                <span>CVSS2: {{ affect.cvss2 }}</span> <span>{{ affect.cvss2_score }}</span>
              </div>
              <div v-if="affect.cvss3 || affect.cvss3_score || affect.nvd_cvss3">
                <span>CVSS3: {{ affect.cvss3 }}</span> <span>{{ affect.cvss3_score }}</span>
              </div>
            </div>
            <div class="col-3 text-end">
              <div>Created date: {{ affect.created_dt }}</div>
              <div>Updated date: {{ affect.updated_dt }}</div>
              <div>Embargoed: {{ affect.embargoed ? 'YES' : 'No' }}</div>
            </div>

            <h4 class="affect-trackers-heading" v-if="affect.trackers && affect.trackers.length > 0">Trackers</h4>
            <div v-for="tracker in affect.trackers">
              <div class="row">
                <div class="col-6 flex-grow-1">
                  <div>Type: {{ affect.type }}</div>
                  <div v-if="affect.external_system_id">External System ID: {{ affect.external_system_id }}</div>
                  <div v-if="affect.status">Status: {{ affect.status }}</div>
                  <div>Resolution: {{ affect.resolution }}</div>
                </div>
                <div class="col-3 text-end">
                  <div>Created date: {{ tracker.created_dt }}</div>
                  <div>Updated date: {{ tracker.updated_dt }}</div>
                </div>
              </div>
              <ul>
                <li v-for="tracker_affects in tracker.affects">Affects: {{ tracker_affects }}</li>
              </ul>
            </div>
          </div>
        </div>

        <div class="row">
          <h3 class="mt-3 mb-2">Summary</h3>
          <span class="form-control span-editable-text" role="textbox" contenteditable>
            {{ flaw.summary }}
          </span>
          <h3 class="mt-3 mb-2">Description</h3>
          <span class="form-control span-editable-text" role="textbox" contenteditable>
            {{ flaw.description }}
          </span>
          <h3 class="mt-3 mb-2">Statement</h3>
          <span class="form-control span-editable-text" role="textbox" contenteditable>
            {{ flaw.statement }}
          </span>
        </div>

        <div class="row">
          <h3 class="mt-3 mb-2">Affects</h3>
          <span class="form-control span-editable-text" role="textbox" contenteditable>
            {{ flaw.summary }}
          </span>
          <h3 class="mt-3 mb-2">Description</h3>
          <span class="form-control span-editable-text" role="textbox" contenteditable>
            {{ flaw.description }}
          </span>
          <h3 class="mt-3 mb-2">Statement</h3>
          <span class="form-control span-editable-text" role="textbox" contenteditable>
            {{ flaw.statement }}
          </span>
        </div>
      </div>

      <h3 class="mt-3 mb-2">Comments</h3>
      <div class="row">
        <ul>
          <li class="p-3" v-for="comment in flaw.comments">
            <p class="border-top pt-2">{{comment.meta_attr.creator}} / <a :href="'#' + comment.type + '/' + comment.external_system_id">{{comment.meta_attr.time}}</a> <span v-if="comment.meta_attr.is_private.toLowerCase() === 'true'">(internal)</span></p>

            <p>{{comment.meta_attr.text}}</p>
          </li>
        </ul>
      </div>

      <hr class="mt-5">
      <div class="row row-cols-5 action-buttons g-3">
        <button class="btn btn-primary col">Customer Pending</button>
        <button class="btn btn-primary col">Close this issue without actions</button>
        <button class="btn btn-primary col">Move this issue to another source queue</button>
        <button class="btn btn-primary col">Create a flaw</button>
        <button class="btn btn-primary col">Create hardening bug/weakness</button>
        <button class="btn btn-primary col">Save</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.span-editable-text {
  cursor: text;
}

* {
  line-height: 1.5;
}

.affected-offering {
  border: 1px solid #ddd;
  padding: 0.5rem;
  margin-bottom: 0.5rem;
}

.action-buttons > button {
  margin: 0.2rem;
}

.affected-module-component {
  font-weight: bold;
}
.affect-trackers-heading {
  font-size: 100%;
  font-weight: bold;
}
</style>
