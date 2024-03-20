<script setup lang="ts">
import { DateTime } from 'luxon';
import { computed, ref, onMounted } from 'vue';
import { RouterLink } from 'vue-router';
import { deepCopyFromRaw } from '@/utils/helpers';

import LabelEditable from '@/components/widgets/LabelEditable.vue';
import LabelSelect from '@/components/widgets/LabelSelect.vue';
import LabelTextarea from '@/components/widgets/LabelTextarea.vue';
import LabelInput from '@/components/widgets/LabelInput.vue';
import LabelCollapsable from '@/components/widgets/LabelCollapsable.vue';
import AffectedOfferings from '@/components/AffectedOfferings.vue';
import IssueFieldEmbargo from '@/components/IssueFieldEmbargo.vue';
import CveRequestForm from '@/components/CveRequestForm.vue';
import IssueFieldStatus from './IssueFieldStatus.vue';
import LabelStatic from './widgets/LabelStatic.vue';
import IssueFieldReferences from './IssueFieldReferences.vue';
import IssueFieldAcknowledgments from './IssueFieldAcknowledgments.vue';
import CvssNISTForm from '@/components/CvssNISTForm.vue';
import FlawComments from '@/components/FlawComments.vue';

import { useFlawModel, type FlawEmitter } from '@/composables/useFlawModel';
import { fileTracker, type TrackersFilePost } from '@/services/TrackerService';
import type { ZodFlawType } from '@/types/zodFlaw';

const props = defineProps<{
  flaw: any;
  mode: 'create' | 'edit';
}>();

const emit = defineEmits<FlawEmitter>();

const {
  flaw,
  trackerUuids,
  flawTypes, // Visually hidden field
  flawSources,
  flawImpacts,
  flawIncidentStates,
  osimLink,
  bugzillaLink,
  flawRhCvss,
  flawNvdCvssScore,
  flawReferences,
  flawAcknowledgments,
  theAffects,
  affectsToDelete,
  addBlankReference,
  addBlankAcknowledgment,
  addBlankAffect,
  removeAffect,
  recoverAffect,
  updateFlaw,
  createFlaw,
  addPublicComment,
  saveReferences,
  deleteReference,
  cancelAddReference,
  saveAcknowledgments,
  deleteAcknowledgment,
} = useFlawModel(props.flaw, emit);

const initialFlaw = ref<ZodFlawType>();

const isSaving = ref(false);

onMounted(() => {
  initialFlaw.value = deepCopyFromRaw(props.flaw) as ZodFlawType;
});

const onSubmit = async () => {
  if (props.mode === 'edit') {
    isSaving.value = true;
    await updateFlaw();
    isSaving.value = false;
  }
  if (props.mode === 'create') {
    isSaving.value = true;
    await createFlaw();
    isSaving.value = false;
  }
};

// TODO
const errors = {
  cve_id: null,
  impact: null,
  cwe_id: null,
  major_incident_state: null,
  reported_dt: null,
  unembargo_dt: null,
  type: null,
  component: null,
  source: null,
};

const flawCvss3CaculatorLink = computed(
  () => `https://www.first.org/cvss/calculator/3.1#${flawRhCvss.value?.vector}`,
);

const onReset = () => {
  flaw.value = deepCopyFromRaw(initialFlaw.value as Record<string, any>) as ZodFlawType;
};

const displayCvssNISTForm = computed(() => {
  const rhCvss = `${flawRhCvss.value?.score}/${flawRhCvss.value?.vector}`;
  const nvdCvssScore = flawNvdCvssScore.toString();
  return rhCvss !== nvdCvssScore;
});

const cvssString = computed(() => {
  return `${flawRhCvss.value?.score}/${flawRhCvss.value?.vector}`;
});
</script>

<template>
  <form class="osim-flaw-form" @submit.prevent="onSubmit">
    <div class="osim-content container-lg pt-5">
      <div class="row">
        <div class="col-12 osim-alerts-banner">
          <!-- Alerts might go here -->
        </div>
        <div class="col-6">
          <LabelEditable v-model="flaw.title" label="Title" type="text" />
          <LabelEditable
            v-model="flaw.component"
            label="Component"
            type="text"
            :error="errors.component"
          />
          <LabelSelect
            v-model="flaw.type"
            label="Type"
            :options="flawTypes"
            :error="errors.type"
            class="visually-hidden"
          />
          <div class="row">
            <div class="col">
              <LabelEditable
                v-model="flaw.cve_id"
                type="text"
                label="CVE ID"
                :error="errors.cve_id"
              />
            </div>
            <div
              v-if="!(flaw.cve_id || '').includes('CVE') && mode === 'edit'"
              class="col-auto align-self-end mb-3"
            >
              <CveRequestForm
                :bugzilla-link="bugzillaLink"
                :osim-link="osimLink"
                :subject="flaw.title"
                :description="flaw.description"
              />
            </div>
          </div>

          <LabelSelect
            v-model="flaw.impact"
            label="Impact"
            :options="flawImpacts"
            :error="errors.impact"
          />
          <LabelEditable v-model="flawRhCvss.vector" type="text">
            <template #label>
              <span class="mb-0 pt-2 pb-2">CVSSv3
                <br />
                <a
                  :href="flawCvss3CaculatorLink"
                  target="_blank"
                ><i class="bi-calculator me-1"></i>Calculator</a>
              </span>
            </template>
          </LabelEditable>

          <LabelInput v-model="flawRhCvss.score" label="CVSSv3 Score" type="text" />
          <div class="row">
            <div :class="['col', { 'cvss-button-div': displayCvssNISTForm }]">
              <LabelStatic v-model="flawNvdCvssScore" label="NVD CVSSv3" type="text" />
            </div>
            <div v-if="displayCvssNISTForm" class="col-auto align-self-end mb-3">
              <CvssNISTForm
                :cveid="flaw.cve_id"
                :flaw-summary="flaw.summary"
                :bugzilla="bugzillaLink"
                :cvss="cvssString"
                :nistcvss="flawNvdCvssScore?.toString()"
              />
            </div>
          </div>
          <LabelEditable
            v-model="flaw.cwe_id"
            label="CWE ID"
            type="text"
            :error="errors.cwe_id"
          />
          <LabelSelect
            v-model="flaw.source"
            label="Source"
            :options="flawSources"
            :error="errors.source"
          />
        </div>

        <div class="col-6">
          <IssueFieldStatus
            v-if="mode === 'edit'"
            :classification="flaw.classification"
            :flawId="flaw.uuid"
          />
          <LabelSelect
            v-model="flaw.major_incident_state"
            label="Incident State"
            :options="flawIncidentStates"
            :error="errors.major_incident_state"
          />
          <LabelEditable
            v-model="flaw.reported_dt"
            label="Reported Date"
            type="date"
            :error="errors.reported_dt"
          />
          <LabelEditable
            v-model="flaw.unembargo_dt"
            :label="
              'Public Date' +
                (DateTime.fromISO(flaw.unembargo_dt as string).diffNow().milliseconds > 0
                  ? ' [FUTURE]'
                  : '')
            "
            type="date"
            :error="errors.unembargo_dt"
          />
          <IssueFieldEmbargo
            v-model="flaw.embargoed"
            :isFlawNew="!flaw.uuid"
            :cveId="flaw.cve_id"
          />
          <LabelEditable v-model="flaw.owner" label="Assignee" type="text" />
          <LabelEditable v-model="flaw.team_id" type="text" label="Team ID" />
        </div>
      </div>
      <div class="mt-3 pt-4 pb-3 mb-4 border-top border-bottom">
        <div class="osim-doc-text-container">
          <LabelCollapsable label="Document Text Fields">
            <LabelTextarea v-if="flaw.summary" v-model="flaw.summary" label="Summary" />
            <LabelTextarea v-if="flaw.description" v-model="flaw.description" label="Description" />
            <LabelTextarea v-if="flaw.statement" v-model="flaw.statement" label="Statement" />
            <LabelTextarea v-if="flaw.mitigation" v-model="flaw.mitigation" label="Mitigation" />
            <div v-if="!flaw.summary" class="mb-3">
              <button class="btn btn-secondary" @click="flaw.summary = 'Summary Text ...'">
                Add Summary
              </button>
            </div>
            <div v-if="!flaw.description" class="mb-3">
              <button class="btn btn-secondary" @click="flaw.description = 'Description Text ...'">
                Add Description
              </button>
            </div>
            <div v-if="!flaw.statement" class="mb-3">
              <button class="btn btn-secondary" @click="flaw.statement = 'Statement Text ...'">
                Add Statement
              </button>
            </div>
            <div v-if="!flaw.mitigation" class="mb-3">
              <button class="btn btn-secondary" @click="flaw.mitigation = 'Mitigation Text ...'">
                Add Mitigation
              </button>
            </div>
          </LabelCollapsable>
          <IssueFieldReferences
            v-model="flawReferences"
            :isEmbargoed="flaw.embargoed"
            @reference:update="saveReferences"
            @reference:new="addBlankReference(flaw.embargoed)"
            @reference:cancel-new="cancelAddReference"
            @reference:delete="deleteReference"
          />
          <IssueFieldAcknowledgments
            v-model="flawAcknowledgments"
            @acknowledgment:update="saveAcknowledgments"
            @acknowledgment:new="addBlankAcknowledgment(flaw.embargoed)"
            @acknowledgment:delete="deleteAcknowledgment"
          />

          <LabelCollapsable label="Trackers">
            <ul>
              <li v-for="(tracker, trackerIndex) in trackerUuids" :key="trackerIndex">
                <RouterLink :to="{ name: 'tracker-details', params: { id: tracker.uuid } }">
                  {{ tracker.display }}
                </RouterLink>
              </li>
            </ul>
          </LabelCollapsable>
        </div>
      </div>
      <AffectedOfferings
        :theAffects="theAffects"
        :affectsToDelete="affectsToDelete"
        :mode="mode"
        @recover="(affect) => recoverAffect(theAffects.indexOf(affect))"
        @remove="(affect) => removeAffect(theAffects.indexOf(affect))"
        @file-tracker="fileTracker($event as TrackersFilePost)"
        @add-blank-affect="addBlankAffect"
      />
      <div v-if="mode === 'edit'" class="border-top mt-4">
        <FlawComments :comments="flaw.comments" @comment:add-public="addPublicComment" />
      </div>
    </div>
    <div class="osim-action-buttons sticky-bottom d-grid gap-2 d-flex justify-content-end">
      <!-- <button type="button" class="btn btn-primary col">Customer Pending</button>-->
      <!-- <button type="button" class="btn btn-primary col">
        Close this issue without actions 
      </button>-->
      <!-- <button type="button" class="btn btn-primary col">
        Move this issue to another source queue
      </button>-->
      <!-- <button type="button" class="btn btn-primary col">Create a flaw</button>-->
      <!-- <button type="button" class="btn btn-primary col">
        Create hardening bug/weakness 
      </button>-->
      <div v-if="mode === 'edit'">
        <button type="button" class="btn btn-secondary" @click="onReset">Reset Changes</button>
        <button
          v-osim-loading.grow="isSaving"
          type="submit"
          class="btn btn-primary ms-3"
          :disabled="isSaving"
        >
          Save Changes
        </button>
      </div>
      <div v-else>
        <button type="submit" class="btn btn-primary col">Create New Flaw</button>
      </div>
    </div>
  </form>
</template>

<style scoped lang="scss">
form.osim-flaw-form :deep(*) {
  line-height: 1.5;
  font-family: 'Red Hat Mono', monospace;
}

:deep(.osim-input) {
  .row {
    align-items: stretch;
  }

  div.col-9 {
    padding-left: 0;

    input,
    span,
    select,
    div.form-control {
      border-top-left-radius: 0;
      border-bottom-left-radius: 0;
    }

    .osim-editable-text,
    .input-group,
    .osim-editable-date,
    span.form-control,
    input.form-control {
      height: 100%;

      * {
        display: flex;
        align-items: center;
      }
    }
  }

  span.form-label {
    text-align: right;
    margin-bottom: 0;
    background-color: #dee2e6;
    border-bottom-left-radius: 0.5rem;
    border-top-left-radius: 0.5rem;
    margin-right: 0 !important;
    display: flex;
    align-items: center;
    justify-content: end;

    &:has(+ textarea),
    &:has(+ .osim-static-label-value.osim-top-label-style) {
      border-top-right-radius: 0.5rem;
      border-bottom-left-radius: 0;
      text-align: left;
      padding: 0.375rem;
      justify-content: center;
    }
  }

  textarea {
    border-top-left-radius: 0;
  }
}

.span-editable-text {
  cursor: text;
}

// .affected-offering {
//   border: 1px solid #ddd;
//   padding: 0.5rem;
//   margin-bottom: 0.5rem;
// }

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

.osim-action-buttons {
  background: white;
  border-top: 1px solid #ddd;
  margin-left: 20px;
  margin-right: 20px;
  padding-right: 20px;
  padding-bottom: 2rem;
  padding-top: 0.5rem;
}

.osim-doc-text-container {
  max-width: 80ch;
}

.cvss-button-div {
  width: 60%;
}
</style>
