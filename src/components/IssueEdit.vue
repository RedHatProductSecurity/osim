<script setup lang="ts">

import { DateTime } from 'luxon';
import { computed, reactive, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { ZodFlawSchema, type ZodFlawType } from '../types/zodFlaw';
import LabelEditable from '@/components/widgets/LabelEditable.vue';
import LabelSelect from '@/components/widgets/LabelSelect.vue';
import LabelTextarea from '@/components/widgets/LabelTextarea.vue';
import LabelInput from '@/components/widgets/LabelInput.vue';
import AffectedOfferingForm from '@/components/AffectedOfferingForm.vue';
import IssueFieldEmbargo from '@/components/IssueFieldEmbargo.vue';
import CveRequestForm from '@/components/CveRequestForm.vue';
import PillList from '@/components/widgets/PillList.vue';
import IssueFieldStatus from './IssueFieldStatus.vue';

import { getDisplayedOsidbError } from '@/services/OsidbAuthService';
import { postAffect, putAffect } from '@/services/AffectService';
import { notifyApiKeyUnset } from '@/services/ApiKeyService';
import {
  getFlawBugzillaLink,
  getFlawOsimLink,
  postFlawPublicComment,
  putFlaw
} from '@/services/FlawService';

import { useToastStore } from '@/stores/ToastStore';

const {addToast} = useToastStore();

const props = defineProps<{
  flaw: any,
}>();

const emit = defineEmits<{
  'refresh:flaw': [],
}>();

notifyApiKeyUnset();

const flawTypes = Object.values(ZodFlawSchema.shape.type.unwrap().unwrap().enum) as string[];
const flawSources = Object.values(ZodFlawSchema.shape.source.unwrap().unwrap().enum) as string[];
const flawImpacts = Object.values(ZodFlawSchema.shape.impact.unwrap().unwrap().enum) as string[];
const incidentStates = Object.values(ZodFlawSchema.shape.major_incident_state.unwrap().unwrap().enum) as string[];

const cveIds = ref<string[]>([]);
const theAffects = ref<any[]>(props.flaw.affects);

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

let committedFlaw: ZodFlawType = reactive(props.flaw);

const onSubmitAffect = async () => {
  for (let affect of theAffects.value) {
    let go = true;
    console.log('saving the affect', affect);
    console.log(affect.uuid);
    const newAffect = {
      flaw: props.flaw.uuid,
      type: affect.type,
      affectedness: affect.affectedness,
      resolution: affect.resolution,
      ps_module: affect.ps_module,
      ps_component: affect.ps_component,
      impact: affect.impact,
      embargoed: affect.embargoed || false,
      updated_dt: affect.updated_dt,
    }
    if (!go) {
      continue;
    }
    if (affect.uuid != null) {
      await putAffect(affect.uuid, newAffect)
          .then(() => {
            console.log('saved newAffect', newAffect);
            addToast({
              title: 'Info',
              body: `Affect Saved: ${newAffect.ps_component}`,
            });
          })
          .catch(error => {
            const displayedError = getDisplayedOsidbError(error);
            addToast({
              title: 'Error saving Affect',
              body: displayedError,
            });
            console.log(error);
          })
    } else {
      await postAffect(newAffect)
          .then(() => {
            console.log('saved newAffect', newAffect);
            addToast({
              title: 'Info',
              body: `Affect Saved: ${newAffect.ps_component}`,
            });
          })
          .catch(error => {
            const displayedError = getDisplayedOsidbError(error);
            addToast({
              title: 'Error saving Affect',
              body: displayedError,
            });
            console.log(error);
          })
    }
  }
  emit('refresh:flaw');
}

const onSubmit = () => {
  let flaw = props.flaw;
  let flawSaved = false;
  // Save Flaw, then safe Affects, then refresh
  putFlaw(props.flaw.uuid, flaw)
      .then(() => {
        flawSaved = true;
        console.log('saved flaw', flaw);
      })
      .then(() => {
        if (flawSaved) {
          addToast({
            title: 'Info',
            body: 'Flaw Saved',
          });
          emit('refresh:flaw');
        }
      })
      .catch(error => {
        const displayedError = getDisplayedOsidbError(error);
        addToast({
          title: 'Error saving Flaw',
          body: displayedError,
        });
        console.log(error);
      })
  for (let affect of theAffects.value) {
    console.log('saving the affect', affect);
  }
};

const onReset = (payload: MouseEvent) => {
  console.log('onReset');
  // FIXME XXX TODO
}

const flawCvss3CaculatorLink = computed(()=>{
  let link = props.flaw.cvss3;
  const index = props.flaw.cvss3.indexOf('CVSS');
  if(index != -1) {
    link = link.slice(index);
  }
  return `https://www.first.org/cvss/calculator/3.1#${link}`;
});

props.flaw.reported_dt = DateTime.fromISO(props.flaw.reported_dt, { zone: 'utc' }).toJSDate();
props.flaw.unembargo_dt = DateTime.fromISO(props.flaw.unembargo_dt, { zone: 'utc' }).toJSDate();

console.log('flaw reported_dt', props.flaw.reported_dt);

const addComment = ref(false);
const newPublicComment = ref('');

const trackerUuids = computed(() => {
  return (props.flaw.affects ?? [])
      .flatMap((affect: any) => {
        return affect.trackers ?? []
      })
      .flatMap((tracker: any) => {
        return {
          uuid: tracker.uuid,
          display: tracker.type + ' ' + tracker.external_system_id,
        };
      })
});

function onreset() {
  // TODO FIX
}


function addPublicComment() {
  postFlawPublicComment(props.flaw.uuid, newPublicComment.value)
      .then(() => {
        addToast({
          title: 'Comment saved',
          body: 'Comment saved',
        });
        newPublicComment.value = '';
        addComment.value = false;
        emit('refresh:flaw');
      })
      .catch(e => {
        addToast({
          title: 'Error saving comment',
          body: getDisplayedOsidbError(e),
        });
      })
}

function addBlankAffect() {
  theAffects.value.push({});
}
function removeAffect(affectIdx: number) {
  theAffects.value.splice(affectIdx, 1);
}

</script>

<template>
  <form
      class="osim-content container"
      @submit="onSubmit()"
  >
  <div class="row mt-3 mb-5">
    <LabelEditable v-model="flaw.title"  label="Title" type="text"/>
    <div class="col">
      <div class="row">
        <div class="col-6">
            <LabelEditable label="Component" type="text" v-model="flaw.component" :error="errors.component"/>
            <LabelSelect label="Type" :options="flawTypes" v-model="flaw.type" :error="errors.type"/>
            <div class="">
              <div class="row">
                <div class="col">
                  <label class="osim-input has-validation mb-3 border-start ps-3">
                    <span class="form-label">
                      CVE IDs
                    </span>
                    <PillList v-model="cveIds"/>
                  </label>
                  <LabelEditable
                      label="CVE ID" type="text" v-model="flaw.cve_id" :error="errors.cve_id"/>
                </div>
                <div v-if="!(flaw.cve_id || '').includes('CVE')" class="col-auto align-self-end mb-3">
                  <CveRequestForm
                      :bugzilla-link="getFlawBugzillaLink(flaw)"
                      :osim-link="getFlawOsimLink(flaw.uuid)"
                      :subject="flaw.title"
                      :description="flaw.description"
                  />
                </div>
              </div>
            </div>
            <LabelSelect label="Impact" :options="flawImpacts" v-model="flaw.impact" :error="errors.impact"/>
            <LabelEditable type="text" v-model="flaw.cvss3" :error="errors.cvss3">
              <template #label>
                CVSS3 <a :href=flawCvss3CaculatorLink target="_blank" class="ms-1"><i class="bi-calculator"></i>Calculator</a>
              </template>
            </LabelEditable>
            <LabelInput label="CVSS3 Score" type="text" v-model="flaw.cvss3_score" :error="errors.cvss3_score"/>
            <LabelEditable label="NVD CVSS3" type="text" v-model="flaw.nvd_cvss3" :error="errors.nvd_cvss3"/>
            <LabelEditable label="CWE ID" type="text" v-model="flaw.cwe_id" :error="errors.cwe_id"/>
            <LabelSelect label="Source" :options="flawSources" v-model="flaw.source" :error="errors.source"/>
          </div>
          <div class="col-6">
            <IssueFieldStatus :classification="flaw.classification" :flawId="flaw.uuid"/>
            <LabelSelect label="Incident State" :options="incidentStates" v-model="flaw.major_incident_state" :error="errors.major_incident_state"/>
            <LabelEditable label="Reported Date" type="date" v-model="flaw.reported_dt" :error="errors.reported_dt"/>
            <LabelEditable
                :label="'Public Date' + (DateTime.fromJSDate(flaw.unembargo_dt).diffNow().milliseconds > 0 ? ' [FUTURE]' : '')"
                type="date"
                v-model="flaw.unembargo_dt"
                :error="errors.unembargo_dt"/>
            <IssueFieldEmbargo
                v-model="flaw.embargoed"
                :cveId="flaw.cve_id"/>
            <LabelEditable label="Assignee" type="text" v-model="flaw.owner" />
            <LabelEditable type="text" label="Team ID" v-model="flaw.team_id" />
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
        <div class="row osim-affects mb-3">
          <div class="h5">Affected Offerings</div>
          <div
              v-if="theAffects"
              v-for="(affect, affectIdx) in theAffects"
              class="container-fluid row affected-offering">
            <AffectedOfferingForm
                class=""
                v-model="theAffects[affectIdx]"
                @remove="removeAffect(affectIdx)"
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

        <div class="row">
          <LabelTextarea label="Summary" v-model="flaw.summary"/>
          <LabelTextarea label="Description" v-model="flaw.description"/>
          <LabelTextarea label="Statement" v-model="flaw.statement"/>
          <LabelTextarea label="Mitigation" v-model="flaw.mitigation"/>
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
    <div class="osim-action-buttons sticky-bottom d-grid gap-2 d-flex justify-content-end">
      <!--        <button type="button" class="btn btn-primary col">Customer Pending</button>-->
      <!--        <button type="button" class="btn btn-primary col">Close this issue without actions</button>-->
      <!--        <button type="button" class="btn btn-primary col">Move this issue to another source queue</button>-->
      <!--        <button type="button" class="btn btn-primary col">Create a flaw</button>-->
      <!--        <button type="button" class="btn btn-primary col">Create hardening bug/weakness</button>-->
      <button
          type="button"
          class="btn btn-secondary"
          @click="onReset"
      >Reset Changes</button>
      <button
          type="submit"
          class="btn btn-primary"
          @click="onSubmit"
      >Save Changes</button>
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


.osim-content.container label {
  display: block;
}

.osim-action-buttons {
  background: white;
  border-top: 1px solid #ddd;
  margin-left: -20px;
  margin-right: -20px;
  padding-right: 20px;
  padding-bottom: 2rem;
  padding-top: 0.5rem;
}

.osim-affects {
  outline: 1px solid #ddd;
  padding: 1.5em;
}

</style>
