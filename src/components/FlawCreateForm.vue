<script setup lang="ts">
// import type {Flaw} from '@/generated-client';
import { DateTime } from 'luxon';
import {computed, onBeforeMount, onMounted, reactive, ref, watch} from 'vue';

const props = defineProps<{
  // flaw: Flaw,
  modelValue: any,
}>();

// defineProps(['modelValue'])
defineEmits(['update:modelValue'])

// onMounted(() => {
//   props.modelValue.reported_dt = moment();
// })

props.modelValue.state = 'NEW';
props.modelValue.embargoed = computed(() => {
  if (props.modelValue.unembargo_dt == null) {
    return false;
  }
  return DateTime.fromISO(props.modelValue.unembargo_dt).diffNow().milliseconds > 0;
});
props.modelValue.unembargo_dt = computed(() => {
  if (HTML_unembargo_dt.value == null) {
    return null;
  }
  return DateTime.fromJSDate(HTML_unembargo_dt.value).toUTC().toISO();
});

props.modelValue.reported_dt = computed(() => {
  return DateTime.utc().toISO();
});

const embargoChecked = ref(false);

const flaw = reactive({});
const affects = ref<any[]>([]);

const HTML_unembargo_dt = ref<Date | null>(null);

function addAffect() {
  affects.value.push({});
}

function removeAffect(affect: any) {
  console.log(affect);
  console.log(affects.value.indexOf(affect));
  affects.value.splice(affects.value.indexOf(affect), 1);
}

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
      <h2 class="mt-3 mb-2"><span class="input-group"><span class="input-group-text osim-input-fixwidth">Title: </span><input type="text" class="form-control" v-model="modelValue.title" /></span></h2>

      <div class="col">
        <div class="row">
          <div class="col-6">
            <!--<div>UUID: {{ flaw.uuid }}</div>-->
            <div class="input-group mb-2"><span class="input-group-text osim-input-fixwidth">Type: </span><input type="text" class="form-control" v-model="modelValue.type" placeholder="e.g. VULNERABILITY" /></div>
            <div class="input-group mb-2"><span class="input-group-text osim-input-fixwidth">CVE ID: </span><input type="text" class="form-control" v-model="modelValue.cve_id" placeholder="e.g. CVE-2077-1337" /></div>
            <div class="input-group mb-2"><span class="input-group-text osim-input-fixwidth">Flaw source: </span><input type="text" class="form-control" v-model="modelValue.source" placeholder="e.g. CUSTOMER" /></div>
            <div class="input-group mb-2"><span class="input-group-text osim-input-fixwidth">State: </span><input type="text" class="form-control" v-model="modelValue.state" placeholder="e.g. NEW" /></div>
            <div class="input-group mb-2"><span class="input-group-text osim-input-fixwidth">Impact: </span><input type="text" class="form-control" v-model="modelValue.impact" placeholder="e.g. LOW" /></div>
            <div class="input-group mb-2"><span class="input-group-text osim-input-fixwidth">Component: </span><input type="text" class="form-control" v-model="modelValue.component" placeholder="e.g. ssh" /></div>
          </div>
          <div class="col-6 text-end">
            <div class="row">
              <div class="col-6">
                <div class="input-group mb-2" :class="{major: modelValue.is_major_incident}">
                  <span class="input-group-text">Major Incident:</span>
                  <div class="input-group-text">
                    <input type="checkbox" class="form-check-input m-2" v-model="modelValue.is_major_incident"/>
                  </div>
                </div>
              </div>
            </div>

            <!--<div class="input-group mb-2">-->
            <!--  <span class="input-group-text">Reported date: </span><input type="datetime-local" pattern="[0-9]{2}.[0-9]{2}.[0-9]{4}" class="form-control" v-model="modelValue.reported_dt"/>-->
            <!--</div>-->

            <div class="input-group mb-2">
              <span class="input-group-text"><input type="checkbox" class="form-check-input" v-model="embargoChecked"/></span>
              <span class="input-group-text">Unembargo date: </span>

              <input type="datetime-local" class="form-control" v-model="HTML_unembargo_dt"/>
            </div>
            <div v-if="embargoChecked">
              <span v-if="modelValue.embargoed">[EMBARGOED]</span>
              <span v-if="DateTime.fromJSDate(HTML_unembargo_dt.value).diffNow().milliseconds > 0">[FUTURE]</span>
              <span v-else>[PAST]</span>
            </div>
            <div>
              <div v-if="modelValue.trackers && modelValue.trackers.length > 0">Trackers:</div>
              <div v-for="tracker in modelValue.trackers">{{ tracker }}</div>
            </div>
          </div>
        </div>
        <div class="row">
          <div class="col-6">
            <div class="input-group mb-2"><span class="input-group-text osim-input-fixwidth"><input type="checkbox" class="form-check-input me-2">CWE: </span><input type="text" class="form-control" v-model="modelValue.cwe_id" placeholder="e.g. CWE-20->CWE-77"/></div>
            <div class="input-group mb-2"><span class="input-group-text osim-input-fixwidth"><input type="checkbox" class="form-check-input me-2">CVSS3: </span><input type="text" class="form-control" v-model="modelValue.cvss3" placeholder="e.g. 2.2/CVSS:3.1/AV:N/AC:H/PR:H/UI:N/S:U/C:L/I:N/A:N"/></div>
          </div>
          <div class="col-6">
            <div class="input-group mb-2" style="visibility: hidden"><span class="input-group-text osim-input-fixwidth"><input type="checkbox" class="form-check-input me-2">CWE: </span><input type="text" class="form-control"/></div>
            <div class="input-group mb-2"><span class="input-group-text osim-input-fixwidth"><input type="checkbox" class="form-check-input me-2">CVSS3 Score: </span><input type="text" class="form-control" v-model="modelValue.cvss3_score" placeholder="e.g. 2.2"/></div>
          </div>
        </div>

        <!--<div class="row">-->
        <!--  <h3>Affected Offerings</h3>-->
        <!--  <div class="row affected-offering" v-for="(affect, affectIndex) in affects">-->
        <!--    <div class="col-9">-->
        <!--      <button class="btn btn-close" type="button" @click="removeAffect(affect)"></button>-->
        <!--      <div class="row">-->
        <!--        <div class="col-6">-->
        <!--          <span class="input-group mb-2 osim-module">-->
        <!--            <span class="input-group-text">Affected Module: </span>-->
        <!--            <input type="text" class="form-control" v-model="affect.ps_module" />-->
        <!--          </span>-->
        <!--        </div>-->
        <!--        <div class="col-6">-->
        <!--          <span class="input-group mb-2 osim-module">-->
        <!--            <span class="input-group-text">Component: </span>-->
        <!--            <input type="text" class="form-control" v-model="affect.ps_component" />-->
        <!--          </span>-->
        <!--        </div>-->
        <!--      </div>-->
        <!--      <div class="input-group mb-2">-->
        <!--        <span class="input-group-text">Type: </span>-->
        <!--        <input type="text" class="form-control" v-bind="affect.type"/>-->
        <!--      </div>-->
        <!--      <div v-if="affect.external_system_id">External ID: {{ affect.external_system_id }}</div>-->
        <!--      <div class="input-group mb-2">-->
        <!--        <span class="input-group-text">Affectedness: </span>-->
        <!--        <input type="text" class="form-control" v-bind="affect.affectedness"/>-->
        <!--      </div>-->
        <!--      <div class="input-group mb-2">-->
        <!--        <span class="input-group-text">Resolution: </span>-->
        <!--        <input type="text" class="form-control" v-bind="affect.resolution"/>-->
        <!--      </div>-->
        <!--      <div class="input-group mb-2">-->
        <!--        <span class="input-group-text">Impact: </span>-->
        <!--        <input type="text" class="form-control" v-bind="affect.impact"/>-->
        <!--      </div>-->
        <!--      <div class="input-group mb-2">-->
        <!--        <span class="input-group-text">CVSS2: </span>-->
        <!--        <input type="text" class="form-control" v-bind="affect.cvss2"/>-->
        <!--      </div>-->
        <!--      <div v-if="affect.cvss2 || affect.cvss2_score || affect.nvd_cvss2">-->
        <!--        <span>CVSS2: {{ affect.cvss2 }}</span> <span>{{ affect.cvss2_score }}</span>-->
        <!--      </div>-->
        <!--      <div class="input-group mb-2">-->
        <!--        <span class="input-group-text">CVSS3: </span>-->
        <!--        <input type="text" class="form-control" v-bind="affect.cvss3"/>-->
        <!--      </div>-->
        <!--      <div v-if="affect.cvss3 || affect.cvss3_score || affect.nvd_cvss3">-->
        <!--        <span>CVSS3: {{ affect.cvss3 }}</span> <span>{{ affect.cvss3_score }}</span>-->
        <!--      </div>-->
        <!--    </div>-->
        <!--    <div class="col-3 text-end">-->
        <!--      <div class="input-group mb-2">-->
        <!--        <span class="input-group-text">Created date: </span>-->
        <!--        <input type="date" class="form-control" v-bind="affect.created_dt"/>-->
        <!--      </div>-->
        <!--      <div class="input-group mb-2">-->
        <!--        <span class="input-group-text">Updated date: </span>-->
        <!--        <input type="date" class="form-control" v-bind="affect.updated_dt"/>-->
        <!--      </div>-->
        <!--      <div class="input-group mb-2" :class="{major: affect.embargoed}">-->
        <!--        <span class="input-group-text">Embargoed: </span>-->
        <!--        <div class="input-group-text"><input type="checkbox" class="form-check-input m-2" v-model="affect.embargoed"/></div>-->
        <!--      </div>-->
        <!--    </div>-->

        <!--    <h4 class="affect-trackers-heading" v-if="affect.trackers && affect.trackers.length > 0">Trackers</h4>-->
        <!--    <div v-for="tracker in affect.trackers">-->
        <!--      <div class="row">-->
        <!--        <div class="col-6 flex-grow-1">-->
        <!--          <div>Type: {{ affect.type }}</div>-->
        <!--          <div v-if="affect.external_system_id">External System ID: {{ affect.external_system_id }}</div>-->
        <!--          <div v-if="affect.status">Status: {{ affect.status }}</div>-->
        <!--          <div>Resolution: {{ affect.resolution }}</div>-->
        <!--        </div>-->
        <!--        <div class="col-3 text-end">-->
        <!--          <div>Created date: {{ tracker.created_dt }}</div>-->
        <!--          <div>Updated date: {{ tracker.updated_dt }}</div>-->
        <!--        </div>-->
        <!--      </div>-->
        <!--      <ul>-->
        <!--        <li v-for="tracker_affects in tracker.affects">Affects: {{ tracker_affects }}</li>-->
        <!--      </ul>-->
        <!--    </div>-->
        <!--  </div>-->
        <!--  <button class="btn btn-success" type="button" @click="addAffect()">Add Affect</button>-->
        <!--</div>-->

        <div class="row">
          <h3 class="mt-3 mb-2">Summary</h3>
          <textarea class="form-control span-editable-text" role="textbox" contenteditable v-model="modelValue.summary">
            {{ modelValue.summary }}
          </textarea>
          <h3 class="mt-3 mb-2">Description</h3>
          <textarea class="form-control span-editable-text" role="textbox" contenteditable v-model="modelValue.description">
            {{ modelValue.description }}
          </textarea>
          <h3 class="mt-3 mb-2">Statement</h3>
          <textarea class="form-control span-editable-text" role="textbox" contenteditable v-model="modelValue.statement">
            {{ modelValue.statement }}
          </textarea>
        </div>

      </div>

    </div>
  </div>
</template>

<style scoped>

h2 > .input-group * {
  font-size: 2rem;
}

.osim-input-fixwidth {
  min-width: 8rem;
}

.affected-offering .input-group-text {
  min-width: 8.5rem;
}

.major > *{
  background: #fcabab;
}

.osim-module2 {
  width: 40%;
}

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
