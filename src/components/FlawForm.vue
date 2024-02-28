<script setup lang="ts">

import { DateTime } from 'luxon';
import { computed } from 'vue';
import { RouterLink } from 'vue-router';

import LabelEditable from '@/components/widgets/LabelEditable.vue';
import LabelSelect from '@/components/widgets/LabelSelect.vue';
import LabelTextarea from '@/components/widgets/LabelTextarea.vue';
import LabelInput from '@/components/widgets/LabelInput.vue';
import AffectedOfferingForm from '@/components/AffectedOfferingForm.vue';
import IssueFieldEmbargo from '@/components/IssueFieldEmbargo.vue';
import CveRequestForm from '@/components/CveRequestForm.vue';
import IssueFieldStatus from './IssueFieldStatus.vue';
import LabelStatic from './widgets/LabelStatic.vue';
import CvssNISTForm from '@/components/CvssNISTForm.vue';

import { type Flaw, type Affect } from '@/generated-client';

import { useFlawModel } from '@/composables/useFlawModel';

const props = defineProps<{
  flaw: any;
  mode: 'create' | 'edit';
}>();

const emit = defineEmits<{
  'update:flaw': [flaw: Flaw];
  'refresh:flaw': [];
}>();

const {
    flaw,
    addComment,
    newPublicComment,
    trackerUuids,
    flawTypes,
    flawSources,
    flawImpacts,
    flawIncidentStates,
    osimLink,
    bugzillaLink,
    flawRhCvss,
    flawNvdCvssScore,
    theAffects,
    addBlankAffect,
    removeAffect,
    reportAffectAsModified,
    updateFlaw,
    createFlaw,
    addPublicComment,
  } = useFlawModel(props.flaw, emit);

const onSubmit = () => {
  if (props.mode === 'edit') {
    updateFlaw();
  }
  if (props.mode === 'create') {
    createFlaw();
  }
};

// TODO
const errors = {
  cve_id: null,
  impact: null,
  cvss3: null,
  cvss3_score: null,
  nvd_cvss3: null,
  cwe_id: null,
  major_incident_state: null,
  reported_dt: null,
  unembargo_dt: null,
  type: null,
  component: null,
  source: null,
};

const flawCvss3CaculatorLink = computed(() =>
  `https://www.first.org/cvss/calculator/3.1#${flawRhCvss.value?.vector}`
);

const onReset = (payload: MouseEvent) => {
  console.log('onReset');
  // flaw.value = Object.assign({}, committedFlaw.value);
  // FIXME XXX TODO
}

</script>

<template>
  <form @submit.prevent="onSubmit">
    <div class="osim-content container">
      <div class="row mt-3 mb-5">
        <LabelEditable v-model="flaw.title" label="Title" type="text"/>
        <div class="col">
          <div class="row">
            <div class="col-6">
              <LabelEditable label="Component" type="text" v-model="flaw.component" :error="errors.component"/>
              <!-- <LabelSelect label="Type" :options="flawTypes" v-model="flaw.type" :error="errors.type"/> -->
              <div class="">
                <div class="row">
                  <div class="col">
                    <LabelEditable
                        label="CVE ID" type="text" v-model="flaw.cve_id" :error="errors.cve_id"/>
                  </div>
                  <div v-if="!(flaw.cve_id || '').includes('CVE') && mode === 'edit'"
                       class="col-auto align-self-end mb-3">
                    <CveRequestForm
                        :bugzilla-link="bugzillaLink"
                        :osim-link="osimLink"
                        :subject="flaw.title"
                        :description="flaw.description"
                    />
                  </div>
                </div>
              </div>
              <LabelSelect label="Impact" :options="flawImpacts" v-model="flaw.impact" :error="errors.impact"/>
              <LabelEditable type="text" v-model="flawRhCvss.vector" :error="errors.cvss3">
                <template #label>
                  CVSSv3 <a :href=flawCvss3CaculatorLink target="_blank" class="ms-1"><i class="bi-calculator"></i>Calculator</a>
                </template>
              </LabelEditable>
              <LabelInput label="CVSSv3 Score" type="text" v-model="flawRhCvss.score" :error="errors.cvss3_score"/>
              <div class="row">
                <div class="col">
                  <LabelStatic label="NVD CVSSv3" type="text" v-model="flawNvdCvssScore" />
                </div>
                <div v-if="flawRhCvss.score !== flawNvdCvssScore" class="col-auto align-self-end mb-3">
                  <CvssNISTForm :cveid="flaw.cve_id" :flaw-summary="flaw.summary"
                    :bugzilla="bugzillaLink" :cvss="flaw.cvss3"
                    :nistcvss="String(flawNvdCvssScore)" />
                </div>
              </div>
              <LabelEditable label="CWE ID" type="text" v-model="flaw.cwe_id" :error="errors.cwe_id"/>
              <LabelSelect label="Source" :options="flawSources" v-model="flaw.source" :error="errors.source"/>
            </div>
            <div class="col-6">
              <IssueFieldStatus v-if="mode === 'edit'" :classification="flaw.classification" :flawId="flaw.uuid"/>
              <LabelSelect label="Incident State" :options="flawIncidentStates" v-model="flaw.major_incident_state"
                           :error="errors.major_incident_state"/>
              <LabelEditable label="Reported Date" type="date" v-model="flaw.reported_dt" :error="errors.reported_dt"/>
              <LabelEditable
                  :label="'Public Date' + (DateTime.fromISO(flaw.unembargo_dt as string).diffNow().milliseconds > 0 ? ' [FUTURE]' : '')"
                  type="date"
                  v-model="flaw.unembargo_dt"
                  :error="errors.unembargo_dt"/>
              <IssueFieldEmbargo
                  v-model="flaw.embargoed"
                  :cveId="flaw.cve_id"/>
              <LabelEditable label="Assignee" type="text" v-model="flaw.owner"/>
              <LabelEditable type="text" label="Team ID" v-model="flaw.team_id"/>
              <div>
                <div v-if="flaw.trackers && flaw.trackers.length > 0">Trackers:</div>
                <div v-for="tracker in trackerUuids">
                  <RouterLink :to="{name: 'tracker-details', params: {id: tracker.uuid}}">
                    {{ tracker.display }}
                  </RouterLink>
                </div>
              </div>
            </div>
          </div>
          <div class="row">
            <LabelTextarea label="Summary" v-model="flaw.summary"/>
            <LabelTextarea label="Description" v-model="flaw.description"/>
            <LabelTextarea label="Statement" v-model="flaw.statement"/>
            <LabelTextarea label="Mitigation" v-model="flaw.mitigation"/>
          </div>
          <div v-if="mode==='edit'" class="row osim-affects mb-3">
            <div class="h5">Affected Offerings</div>
            <div
                v-if="theAffects"
                v-for="(affect, affectIdx) in theAffects"
                class="container-fluid row affected-offering">
              <AffectedOfferingForm
                :modelValue="affect"
                @update:modelValue="(newValue) => console.log(newValue)"
                @remove="removeAffect(affectIdx)"
                :reportAffectAsModified="reportAffectAsModified"
              />
            </div>
  
            <div>
              <div class="h6">Add New Affect</div>
              <button
                  type="button"
                  class="btn btn-secondary"
                  @click.prevent="addBlankAffect()"
              >Add New Affect</button>
            </div>
          </div>
        </div>
        <div v-if="mode==='edit'">
          <h3 class="mt-3 mb-2">Comments</h3>
          <div class="row">
            <ul>
              <li class="p-3" v-for="comment in flaw.comments">
                <p class="border-top pt-2">
                  {{ comment.meta_attr?.creator }} /
                  <a :href="'#' + comment.type + '/' + comment.external_system_id">
                    {{ comment.meta_attr?.time }}
                  </a>
                  <span v-if="comment.meta_attr?.is_private.toLowerCase() === 'true'"
                  >(internal)</span>
                </p>
                <p>{{ comment.meta_attr?.text }}</p>
              </li>
            </ul>
            <div v-if="!addComment">
              <button
                  type="button"
                  @click="addComment = true"
                  class="btn btn-secondary col"
              >Add Public Comment</button>
            </div>
            <div v-if="addComment">
              <LabelTextarea label="New Public Comment" v-model="newPublicComment"/>
              <button
                  type="button"
                  @click="addPublicComment"
                  class="btn btn-primary col"
              >Add Public Comment</button>
              <!--          <button type="button" class="btn btn-primary col">Add Private Comment</button>-->
            </div>
          </div>
        </div>
      </div>
      
    </div>
    <div class="osim-action-buttons sticky-bottom d-grid gap-2 d-flex justify-content-end">
        <!--        <button type="button" class="btn btn-primary col">Customer Pending</button>-->
        <!--        <button type="button" class="btn btn-primary col">Close this issue without actions</button>-->
        <!--        <button type="button" class="btn btn-primary col">Move this issue to another source queue</button>-->
        <!--        <button type="button" class="btn btn-primary col">Create a flaw</button>-->
        <!--        <button type="button" class="btn btn-primary col">Create hardening bug/weakness</button>-->
      <div v-if="mode==='edit'">
        <button
            type="button"
            class="btn btn-secondary"
            @click="onReset"
        >
          Reset Changes
        </button>
        <button
            type="submit"
            class="btn btn-primary ms-3"
        >
          Save Changes
        </button>
      </div>
      <div v-else >
          <button type="submit" class="btn btn-primary col">Create New Flaw</button>
      </div>
    </div>
  </form>
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

.osim-affects {
  outline: 1px solid #ddd;
  padding: 1.5em;
}
.osim-action-buttons {
  background: white;
  border-top: 1px solid #ddd;
  margin-left: 20px;
  margin-right: 20px;
  padding-right: 20px;
  padding-bottom: 2rem;
  padding-top: 0.5rem;
}
</style>
