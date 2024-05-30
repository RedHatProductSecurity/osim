<script setup lang="ts">
import { DateTime } from 'luxon';
import { computed, ref, watch, onMounted } from 'vue';
import { RouterLink } from 'vue-router';
import { deepCopyFromRaw } from '@/utils/helpers';

import LabelEditable from '@/components/widgets/LabelEditable.vue';
import LabelSelect from '@/components/widgets/LabelSelect.vue';
import LabelTextarea from '@/components/widgets/LabelTextarea.vue';
import LabelCollapsible from '@/components/widgets/LabelCollapsible.vue';
import AffectedOfferings from '@/components/AffectedOfferings.vue';
import IssueFieldEmbargo from '@/components/IssueFieldEmbargo.vue';
import CveRequestForm from '@/components/CveRequestForm.vue';
import IssueFieldState from './IssueFieldState.vue';
import FlawFormAssignee from '@/components/FlawFormAssignee.vue';
import IssueFieldReferences from './IssueFieldReferences.vue';
import IssueFieldAcknowledgments from './IssueFieldAcknowledgments.vue';
import CvssNISTForm from '@/components/CvssNISTForm.vue';
import FlawComments from '@/components/FlawComments.vue';
import LabelDiv from '@/components/widgets/LabelDiv.vue';
import CvssCalculator from '@/components/CvssCalculator.vue';

import { useFlawModel } from '@/composables/useFlawModel';
import { fileTracker, type TrackersFilePost } from '@/services/TrackerService';
import { type ZodFlawType, summaryRequiredStates } from '@/types/zodFlaw';

const props = defineProps<{
  flaw: any;
  mode: 'create' | 'edit';
}>();

const emit = defineEmits<{
  (e: 'refresh:flaw'): void;
}>();

function onSaveSuccess() {
  emit('refresh:flaw');
}

const {
  flaw,
  trackerUuids,
  flawTypes, // Visually hidden field
  flawSources,
  flawImpacts,
  flawIncidentStates,
  osimLink,
  bugzillaLink,
  flawRhCvss3,
  nvdCvss3String,
  flawReferences,
  flawAcknowledgments,
  theAffects,
  affectsToDelete,
  rhCvss3String,
  highlightedNvdCvss3String,
  shouldDisplayEmailNistForm,
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
  cancelAddAcknowledgment,
  saveAcknowledgments,
  deleteAcknowledgment,
  isSaving,
  isValid,
  errors,
} = useFlawModel(props.flaw, onSaveSuccess);

const initialFlaw = ref<ZodFlawType>();

onMounted(() => {
  initialFlaw.value = deepCopyFromRaw(props.flaw) as ZodFlawType;
});

watch(() => props.flaw, () => { // Shallow watch so as to avoid reseting on any change (though that shouldn't happen)
  initialFlaw.value = deepCopyFromRaw(props.flaw) as ZodFlawType;
  onReset();
});

const isPublic = computed(() => !initialFlaw.value?.embargoed);
const showUnembargoingModal = ref(false);
const unembargoing = computed(() => !isPublic.value && !flaw.value.embargoed);

const onSubmit = async () => {
  if (props.mode === 'edit') {
    if (isValid() && unembargoing.value) {
      showUnembargoingModal.value = true;
    } else {
      updateFlaw();
    }
  } else if (props.mode === 'create') {
    createFlaw();
  }
};

const showSummary = ref(flaw.value.summary && flaw.value.summary.trim() !== '');
const showStatement = ref(flaw.value.statement && flaw.value.statement.trim() !== '');
const showMitigation = ref(flaw.value.mitigation && flaw.value.mitigation.trim() !== '');

const onReset = () => {
  flaw.value = deepCopyFromRaw(initialFlaw.value as Record<string, any>) as ZodFlawType;
};

const allowedSources = [
  '',
  'ADOBE',
  'APPLE',
  'BUGTRAQ',
  'CERT',
  'CUSTOMER',
  'CVE',
  'DEBIAN',
  'DISTROS',
  'GENTOO',
  'GIT',
  'GOOGLE',
  'HW_VENDOR',
  'INTERNET',
  'LKML',
  'MAGEIA',
  'MOZILLA',
  'NVD',
  'OPENSSL',
  'ORACLE',
  'OSSSECURITY',
  'OSV',
  'REDHAT',
  'RESEARCHER',
  'SECUNIA',
  'SKO',
  'SUSE',
  'TWITTER',
  'UBUNTU',
  'UPSTREAM',
];

const hiddenSources = computed(() => {
  if (props.mode === 'edit') {
    return flawSources.filter(source => !allowedSources.includes(source));
  }
  return [];
});

const toggleSummary = () => {
  showSummary.value = !showSummary.value;
  if (!showSummary.value) {
    flaw.value.summary = '';
  }
};

const toggleStatement = () => {
  showStatement.value = !showStatement.value;
  if (!showStatement.value) {
    flaw.value.statement = '';
  }
};

const toggleMitigation = () => {
  showMitigation.value = !showMitigation.value;
  if (!showMitigation.value) {
    flaw.value.mitigation = '';
  }
};

</script>

<template>
  <form class="osim-flaw-form" :class="{'osim-disabled': isSaving }" @submit.prevent="onSubmit">
    <div class="osim-content container-lg">
      <div class="row osim-flaw-form-section">
        <div class="col-12 osim-alerts-banner">
          <!-- Alerts might go here -->
        </div>
        <div class="col-6">
          <LabelEditable
            v-model="flaw.title"
            label="Title"
            type="text"
            :error="errors.title"
          />
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
                :embargoed="flaw.embargoed"
                :bugzilla-link="bugzillaLink"
                :osim-link="osimLink"
                :subject="flaw.title"
                :description="flaw.summary ?? ''"
              />
            </div>
          </div>
          <LabelSelect
            v-model="flaw.impact"
            label="Impact"
            :options="flawImpacts"
            :error="errors.impact"
          />
          <CvssCalculator
            v-model:cvss-vector="flawRhCvss3.vector"
            v-model:cvss-score="flawRhCvss3.score"
          />
          <div class="row">
            <div class="col">
              <LabelDiv label="NVD CVSSv3">
                <div class="form-control text-break h-100">
                  <div class="p-0 h-100">
                    <span
                      v-for="char in highlightedNvdCvss3String"
                      :key="char.char"
                      :class="{'text-primary': char.isHighlighted}"
                    >
                      {{ char.char }}
                    </span>
                  </div>
                </div>
              </LabelDiv>
            </div>
            <div v-if="shouldDisplayEmailNistForm" class="col-auto align-self-center mb-3">
              <CvssNISTForm
                :cveid="flaw.cve_id"
                :flaw-summary="flaw.description"
                :bugzilla="bugzillaLink"
                :cvss="rhCvss3String"
                :nistcvss="nvdCvss3String"
              />
            </div>
            <span
              v-if="shouldDisplayEmailNistForm"
              class="text-info bg-white px-3 py-2 cvss-score-error"
            >
              Explain non-obvious CVSSv3 score metrics
            </span>
          </div>
          <LabelEditable
            v-model="flaw.cwe_id"
            label="CWE ID"
            type="text"
            :error="errors.cwe_id"
          />
          <LabelSelect
            v-model="flaw.source"
            label="CVE Source"
            :options="flawSources"
            :error="errors.source"
            :options-hidden="hiddenSources"
          />
        </div>

        <div class="col-6">
          <IssueFieldState
            v-if="mode === 'edit'"
            :classification="flaw.classification"
            :flawId="flaw.uuid"
            @refresh:flaw="emit('refresh:flaw')"
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
            type="datetime"
            :error="errors.unembargo_dt"
          />
          <IssueFieldEmbargo
            v-model="flaw.embargoed"
            v-model:showModal="showUnembargoingModal"
            :isFlawNew="!flaw.uuid"
            :isPublic="isPublic"
            :flawId="flaw.cve_id || flaw.uuid"
            @updateFlaw="updateFlaw"
          />
          <FlawFormAssignee v-model="flaw.owner" />
        </div>
      </div>
      <div class="osim-flaw-form-section border-top">
        <LabelTextarea
          v-model="flaw.description"
          label="Comment#0"
          placeholder="Comment#0 ..."
          :error="errors.description"
          :disabled="mode === 'edit'"
        />
        <LabelTextarea
          v-if="showSummary"
          v-model="flaw.summary"
          label="Description"
          placeholder="Description Text ..."
          :error="errors.summary"
          class="osim-flaw-description-component"
        >
          <template #label>
            <span class="form-label col-3 osim-folder-tab-label">
              Description
            </span>
            <span class="col-3 ps-2">
              <select v-model="flaw.requires_summary" class="form-select col-3 osim-summary-required">
                <option disabled :selected="!flaw.requires_summary" value="">Review Status</option>
                <option v-for="state in summaryRequiredStates" :key="state" :value="state">{{ state }}</option>
              </select>
            </span>

          </template>
        </LabelTextarea>
        <LabelTextarea
          v-if="showStatement"
          v-model="flaw.statement"
          label="Statement"
          placeholder="Statement Text ..."
          :error="errors.statement"
        />
        <LabelTextarea
          v-if="showMitigation"
          v-model="flaw.mitigation"
          label="Mitigation"
          placeholder="Mitigation Text ..."
          :error="errors.mitigation"
        />
        <div class="d-flex gap-3 mb-3">
          <button
            type="button"
            class="btn btn-secondary osim-show-summary"
            @click="toggleSummary"
          >
            {{ showSummary ? 'Remove Description' : 'Add Description' }}
          </button>
          <button
            type="button"
            class="btn btn-secondary"
            @click="toggleStatement"
          >
            {{ showStatement ? 'Remove Statement' : 'Add Statement' }}
          </button>
          <button
            type="button"
            class="btn btn-secondary"
            @click="toggleMitigation"
          >
            {{ showMitigation ? 'Remove Mitigation' : 'Add Mitigation' }}
          </button>
        </div>
      </div>
      <div class="osim-flaw-form-section border-top border-bottom">
        <div class="d-flex gap-3">
          <IssueFieldReferences
            v-model="flawReferences"
            class="w-100 my-3"
            :error="errors.references"
            @reference:update="saveReferences"
            @reference:new="addBlankReference(flaw.embargoed)"
            @reference:cancel-new="cancelAddReference"
            @reference:delete="deleteReference"
          />
          <IssueFieldAcknowledgments
            v-model="flawAcknowledgments"
            class="w-100 my-3"
            :error="errors.acknowledgments"
            @acknowledgment:update="saveAcknowledgments"
            @acknowledgment:new="addBlankAcknowledgment(flaw.embargoed)"
            @acknowledgment:cancel-new="cancelAddAcknowledgment"
            @acknowledgment:delete="deleteAcknowledgment"
          />
        </div>
        <LabelCollapsible
          v-if="mode === 'edit'"
          :label="`Trackers: ${trackerUuids.length}`"
          :isExpandable="trackerUuids.length !== 0"
        >
          <ul>
            <li v-for="(tracker, trackerIndex) in trackerUuids" :key="trackerIndex">
              <RouterLink :to="{ name: 'tracker-details', params: { id: tracker.uuid } }">
                {{ tracker.display }}
              </RouterLink>
            </li>
          </ul>
        </LabelCollapsible>
      </div>
      <AffectedOfferings
        v-if="mode === 'edit'"
        :theAffects="theAffects"
        :affectsToDelete="affectsToDelete"
        class="osim-flaw-form-section"
        :error="errors.affects"
        @affect:recover="(affect) => recoverAffect(theAffects.indexOf(affect))"
        @affect:remove="(affect) => removeAffect(theAffects.indexOf(affect))"
        @file-tracker="fileTracker($event as TrackersFilePost)"
        @add-blank-affect="addBlankAffect"
      />
      <div v-if="mode === 'edit'" class="border-top osim-flaw-form-section">
        <FlawComments
          :comments="flaw.comments"
          :error="errors.comments"
          :isSaving="isSaving"
          @comment:addPublicComment="addPublicComment"
          @refresh:flaw="emit('refresh:flaw')"
        />
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
      <div v-if="mode === 'create'">
        <button
          v-osim-loading.grow="isSaving"
          type="submit"
          class="btn btn-primary ms-3"
          :disabled="isSaving"
        >
          Create New Flaw
        </button>
      </div>
    </div>
  </form>
</template>

<style scoped lang="scss">
form.osim-flaw-form :deep(*) {
  line-height: 1.5;
  font-family: 'Red Hat Mono', monospace;

  .osim-flaw-form-section{
    padding-block: 3rem;
  }
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
    &.osim-folder-tab-label {
      border-top-right-radius: 0.5rem;
      border-bottom-left-radius: 0;
      text-align: left;
      padding: 0.375rem;
      justify-content: center;
    }
  }

  textarea {
    border-top-right-radius: 0.5rem;
    border-top-left-radius: 0;
  }

  select.osim-summary-required.form-select {
    border-bottom-right-radius: 0;
    border-bottom-left-radius: 0;
    margin-bottom: 0;
    border-bottom: none;
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

.cvss-score-error{
  margin-top: -15px;
}

</style>
