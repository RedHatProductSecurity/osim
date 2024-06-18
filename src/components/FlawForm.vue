<script setup lang="ts">
import { DateTime } from 'luxon';
import { computed, ref, watch, onMounted } from 'vue';
import { deepCopyFromRaw } from '@/utils/helpers';

import LabelEditable from '@/components/widgets/LabelEditable.vue';
import LabelTagsInput from '@/components/widgets/LabelTagsInput.vue';
import LabelSelect from '@/components/widgets/LabelSelect.vue';
import LabelStatic from '@/components/widgets/LabelStatic.vue';
import LabelTextarea from '@/components/widgets/LabelTextarea.vue';
import AffectedOfferings from '@/components/AffectedOfferings.vue';
import IssueFieldEmbargo from '@/components/IssueFieldEmbargo.vue';
import CveRequestForm from '@/components/CveRequestForm.vue';
import IssueFieldState from './IssueFieldState.vue';
import FlawFormOwner from '@/components/FlawFormOwner.vue';
import IssueFieldReferences from './IssueFieldReferences.vue';
import IssueFieldAcknowledgments from './IssueFieldAcknowledgments.vue';
import CvssNISTForm from '@/components/CvssNISTForm.vue';
import FlawComments from '@/components/FlawComments.vue';
import LabelDiv from '@/components/widgets/LabelDiv.vue';
import CvssCalculator from '@/components/CvssCalculator.vue';
import FlawAlertsList from '@/components/FlawAlertsList.vue';

import { useFlawModel } from '@/composables/useFlawModel';
import { type ZodFlawType, descriptionRequiredStates } from '@/types/zodFlaw';
import { type ZodTrackerType, type ZodAffectCVSSType } from '@/types/zodAffect';
import { useDraftFlawStore } from '@/stores/DraftFlawStore';
import CvssExplainForm from './CvssExplainForm.vue';
import FlawContributors from '@/components/FlawContributors.vue';

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
  flawSources,
  flawImpacts,
  flawIncidentStates,
  osimLink,
  bugzillaLink,
  flawRhCvss3,
  nvdCvss3String,
  flawReferences,
  flawAcknowledgments,
  affectsToDelete,
  rhCvss3String,
  highlightedNvdCvss3String,
  shouldDisplayEmailNistForm,
  shouldCreateJiraTask,
  toggleShouldCreateJiraTask,
  addBlankReference,
  addBlankAcknowledgment,
  addBlankAffect,
  removeAffect,
  recoverAffect,
  updateFlaw,
  createFlaw,
  addFlawComment,
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


const { draftFlaw } = useDraftFlawStore();
let initialFlaw: ZodFlawType;

onMounted(() => {
  initialFlaw = deepCopyFromRaw(props.flaw) as ZodFlawType;
  isEmbargoed.value = initialFlaw?.embargoed;
  if (draftFlaw) {
    flaw.value = useDraftFlawStore().addDraftFields(flaw.value);
    useDraftFlawStore().$reset();
  }
});

watch(() => props.flaw, () => { // Shallow watch so as to avoid reseting on any change (though that shouldn't happen)
  initialFlaw = deepCopyFromRaw(props.flaw) as ZodFlawType;
  isEmbargoed.value = initialFlaw?.embargoed;
  onReset();
});

const isEmbargoed = ref();
const showUnembargoingModal = ref(false);
const unembargoing = computed(() => isEmbargoed.value && !flaw.value.embargoed);

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

const showDescription = ref(flaw.value.cve_description && flaw.value.cve_description.trim() !== '');
const showStatement = ref(flaw.value.statement && flaw.value.statement.trim() !== '');
const showMitigation = ref(flaw.value.mitigation && flaw.value.mitigation.trim() !== '');

const onReset = () => {
  // is deepCopyFromRaw needed?
  flaw.value = deepCopyFromRaw(initialFlaw);
  shouldCreateJiraTask.value = false;
};

const onUnembargoed = (isEmbargoed: boolean) => {
  if (!isEmbargoed && !flaw.value.unembargo_dt) {
    flaw.value.unembargo_dt = DateTime.now().toUTC().toISO();
  }
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
  return flawSources.filter(source => !allowedSources.includes(source));
});

const toggleDescription = () => {
  showDescription.value = !showDescription.value;
  if (!showDescription.value) {
    flaw.value.cve_description = '';
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

const affectedOfferingsComp = ref<InstanceType<typeof AffectedOfferings> | null>(null);
const referencesComp = ref<InstanceType<typeof IssueFieldReferences> | null>(null);
const acknowledgmentsComp = ref<InstanceType<typeof IssueFieldAcknowledgments> | null>(null);

const expandFocusedComponent = (parent_uuid: string) => {

  // Expand Affect (affect, affect CVSS, tracker)
  const trackers: ZodTrackerType[] = ([] as ZodTrackerType[]).concat(
    ...flaw.value.affects.map(aff => aff.trackers)
  );
  const trackerAffectUuid = trackers.find(tracker => tracker.uuid === parent_uuid)?.affects?.[0];

  const affectCvss: ZodAffectCVSSType[] = ([] as ZodAffectCVSSType[]).concat(
    ...flaw.value.affects.map(aff => aff.cvss_scores)
  );
  const affectCvssUuid = affectCvss.find(affCvss => affCvss.uuid === parent_uuid)?.affect;

  const affect = flaw.value.affects.find(aff => [parent_uuid, trackerAffectUuid, affectCvssUuid].includes(aff.uuid));
  if (affect !== undefined) {
    if (affectedOfferingsComp.value) {
      if (!affectedOfferingsComp.value.isExpanded(affect)) {
        affectedOfferingsComp.value.togglePsModuleExpansion(affect?.ps_module);
        affectedOfferingsComp.value.togglePsComponentExpansion(affect);
      }
    }
    return;
  }

  // Expand Flaw References section
  const reference = flawReferences.value.find(refer => refer.uuid === parent_uuid);
  if (reference !== undefined) {
    if (referencesComp.value?.editableListComp) {
      referencesComp.value.editableListComp.isExpanded = true;
    }
    return;
  }

  // Expand Flaw Acknowledgments section
  const acknowledgment = flawAcknowledgments.value.find(ack => ack.uuid === parent_uuid);
  if (acknowledgment !== undefined) {
    if (acknowledgmentsComp.value?.editableListComp) {
      acknowledgmentsComp.value.editableListComp.isExpanded = true;
    }
    return;
  }
};

const formDisabled = ref(false);

const createdDate = computed(() => {
  if (props.mode === 'create') {
    return '';
  }
  return DateTime.fromISO(flaw.value.created_dt!).toUTC().toFormat('yyyy-MM-dd T ZZZZ');
});

</script>

<template>
  <form class="osim-flaw-form" :class="{'osim-disabled': isSaving || formDisabled}" @submit.prevent="onSubmit">
    <div class="osim-content container-fluid">
      <div class="row osim-flaw-form-section" :class="{ 'pt-5': mode === 'create'}">
        <div v-if="flaw.meta_attr?.bz_id" class="osim-flaw-header-link">
          <a
            :href="bugzillaLink"
            class="osim-bugzilla-link"
            target="_blank"
            rel="noopener noreferrer"
          >
            Open in Bugzilla <i class="bi-box-arrow-up-right ms-2" />
          </a>
        </div>
        <div class="col-12 osim-alerts-banner">
          <FlawAlertsList :flaw="flaw" @expandFocusedComponent="expandFocusedComponent" />
        </div>
        <div
          class="row pt-3"
          :class="{'osim-flaw-form-embargoed border border-2 border-primary': flaw.embargoed}"
        >
          <div :id="flaw.uuid" class="col-6">
            <LabelEditable
              v-model="flaw.title"
              label="Title"
              type="text"
              :error="errors.title"
            />
            <LabelTagsInput
              v-model="flaw.components"
              label="Components"
              :error="errors.components"
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
                  :description="flaw.cve_description ?? ''"
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
              :id="flawRhCvss3.uuid"
              v-model:cvss-vector="flawRhCvss3.vector"
              v-model:cvss-score="flawRhCvss3.score"
            />
            <div class="row">
              <div class="col">
                <LabelDiv label="NVD CVSSv3">
                  <div class="d-flex flex-row">
                    <div class="form-control text-break h-auto rounded-0">
                      <template v-for="(chars, index) in highlightedNvdCvss3String" :key="index">
                        <span v-if="chars[0].isHighlighted" class="text-primary">
                          {{ chars.map(c => c.char).join('') }}
                        </span>
                        <template v-else>{{ chars.map(c => c.char).join('') }}</template>
                      </template>
                    </div>
                    <div v-if="shouldDisplayEmailNistForm" class="col-auto align-self-center">
                      <CvssNISTForm
                        :cveid="flaw.cve_id"
                        :summary="flaw.comment_zero"
                        :bugzilla="bugzillaLink"
                        :cvss="rhCvss3String"
                        :nistcvss="nvdCvss3String"
                      />
                    </div>
                  </div>
                </LabelDiv>
              </div>
              <template v-if="shouldDisplayEmailNistForm">
                <div class="col-auto align-self-center mb-3">
                  <CvssNISTForm
                    :cveid="flaw.cve_id"
                    :summary="flaw.comment_zero"
                    :bugzilla="bugzillaLink"
                    :cvss="rhCvss3String"
                    :nistcvss="nvdCvss3String"
                  />
                </div>
                <CvssExplainForm v-model="flaw" />
              </template>
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
              :shouldCreateJiraTask
              @refresh:flaw="emit('refresh:flaw')"
              @create:jiraTask="toggleShouldCreateJiraTask()"
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
              :isEmbargoed="isEmbargoed"
              :flawId="flaw.cve_id || flaw.uuid"
              @updateFlaw="updateFlaw"
              @update:model-value="onUnembargoed"
            />
            <FlawFormOwner v-model="flaw.owner" />
            <LabelStatic
              v-if="mode === 'edit'"
              :modelValue="createdDate"
              label="Created Date"
              type="text"
            />
            <FlawContributors v-if="flaw.task_key" :taskKey="flaw.task_key" />
          </div>
        </div>
      </div>
      <div class="osim-flaw-form-section border-top">
        <LabelTextarea
          v-model="flaw.comment_zero"
          label="Comment#0"
          placeholder="Comment#0 ..."
          :error="errors.comment_zero"
          :disabled="mode === 'edit'"
        />
        <LabelTextarea
          v-if="showDescription"
          v-model="flaw.cve_description"
          label="Description"
          placeholder="Description Text ..."
          :error="errors.cve_description"
          class="osim-flaw-description-component"
        >
          <template #label>
            <span class="form-label col-3 osim-folder-tab-label">
              Description
            </span>
            <span class="col-3 ps-2">
              <select v-model="flaw.requires_cve_description" class="form-select col-3 osim-description-required">
                <option disabled :selected="!flaw.requires_cve_description" value="">Review Status</option>
                <option v-for="state in descriptionRequiredStates" :key="state" :value="state">{{ state }}</option>
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
            class="btn btn-secondary osim-show-description"
            @click="toggleDescription"
          >
            {{ showDescription ? 'Remove Description' : 'Add Description' }}
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
            ref="referencesComp"
            v-model="flawReferences"
            class="w-100 my-3"
            :mode="mode"
            :error="errors.references"
            @reference:update="saveReferences"
            @reference:new="addBlankReference(flaw.embargoed)"
            @reference:cancel-new="cancelAddReference"
            @reference:delete="deleteReference"
          />
          <IssueFieldAcknowledgments
            ref="acknowledgmentsComp"
            v-model="flawAcknowledgments"
            class="w-100 my-3"
            :mode="mode"
            :error="errors.acknowledgments"
            @acknowledgment:update="saveAcknowledgments"
            @acknowledgment:new="addBlankAcknowledgment(flaw.embargoed)"
            @acknowledgment:cancel-new="cancelAddAcknowledgment"
            @acknowledgment:delete="deleteAcknowledgment"
          />
        </div>
      </div>
      <AffectedOfferings
        v-if="mode === 'edit'"
        ref="affectedOfferingsComp"
        :theAffects="flaw.affects"
        :affectsToDelete="affectsToDelete"
        :error="errors.affects"
        :flawId="flaw.uuid"
        @affect:recover="(affect) => recoverAffect(flaw.affects.indexOf(affect))"
        @affect:remove="(affect) => removeAffect(flaw.affects.indexOf(affect))"
        @add-blank-affect="addBlankAffect"
      />
      <div v-if="mode === 'edit'" class="border-top osim-flaw-form-section">
        <FlawComments
          :comments="flaw.comments"
          :taskKey="flaw.task_key"
          :error="errors.comments"
          :isSaving="isSaving"
          @comment:addFlawComment="addFlawComment"
          @disableForm="(value) => formDisabled = value"
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

  .osim-flaw-form-section {
    position: relative;
    padding-block: 2rem;
  }
}

div.osim-content {
  width: 97.5%;
}

:deep(.osim-input) {
  .row {
    align-items: stretch;
  }

  div.col-9 {
    padding-left: 0;

    input,
    span:not(.osim-pill-list-item),
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

  select.osim-description-required.form-select {
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

.osim-flaw-header-link {
  position: absolute;
  right: 0rem;
  top: 2rem;
  width: auto;
}
</style>
