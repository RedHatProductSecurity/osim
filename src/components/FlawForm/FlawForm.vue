<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue';

import { DateTime } from 'luxon';

import IssueFieldEmbargo from '@/components/IssueFieldEmbargo/IssueFieldEmbargo.vue';
import CveRequestForm from '@/components/CveRequestForm/CveRequestForm.vue';
import FlawFormOwner from '@/components/FlawFormOwner/FlawFormOwner.vue';
import CvssSection from '@/components/CvssSection/CvssSection.vue';
import IssueFieldState from '@/components/IssueFieldState/IssueFieldState.vue';
import IssueFieldReferences from '@/components/IssueFieldReferences/IssueFieldReferences.vue';
import IssueFieldAcknowledgments from '@/components/IssueFieldAcknowledgments/IssueFieldAcknowledgments.vue';
import FlawComments from '@/components/FlawComments/FlawComments.vue';
import CvssCalculator from '@/components/CvssCalculator/CvssCalculator.vue';
import FlawAlertsList from '@/components/FlawAlertsList/FlawAlertsList.vue';
import FlawHistory from '@/components/FlawHistory/FlawHistory.vue';
import FlawContributors from '@/components/FlawContributors/FlawContributors.vue';
import CvssExplainForm from '@/components/CvssExplainForm/CvssExplainForm.vue';
import FlawAffects from '@/components/FlawAffects/FlawAffects.vue';
import CweSelector from '@/components/CweSelector/CweSelector.vue';
import FlawLabelsTable from '@/components/FlawLabels/FlawLabelsTable.vue';

import { useFlawModel } from '@/composables/useFlawModel';
import { useFlaw } from '@/composables/useFlaw';
import { useFetchFlaw } from '@/composables/useFetchFlaw';

import LoadingSpinner from '@/widgets/LoadingSpinner/LoadingSpinner.vue';
import LabelTextarea from '@/widgets/LabelTextarea/LabelTextarea.vue';
import LabelStatic from '@/widgets/LabelStatic/LabelStatic.vue';
import LabelSelect from '@/widgets/LabelSelect/LabelSelect.vue';
import LabelTagsInput from '@/widgets/LabelTagsInput/LabelTagsInput.vue';
import LabelEditable from '@/widgets/LabelEditable/LabelEditable.vue';
import {
  MajorIncidentStateEnumWithBlank,
  descriptionRequiredStates,
  flawImpactEnum,
  flawSources,
  type ZodFlawType,
} from '@/types/zodFlaw';
import { useDraftFlawStore } from '@/stores/DraftFlawStore';
import { deepCopyFromRaw } from '@/utils/helpers';
import { allowedSources } from '@/constants/';
import { jiraTaskUrl } from '@/services/JiraService';

const props = defineProps<{
  mode: 'create' | 'edit';
}>();

const emit = defineEmits<{
  (e: 'refresh:flaw'): void;
}>();

function onSaveSuccess() {
  emit('refresh:flaw');
}

const {
  addBlankAcknowledgment,
  addBlankReference,
  addFlawComment,
  bugzillaLink,
  cancelAddAcknowledgment,
  cancelAddReference,
  commentsByType,
  createFlaw,
  deleteAcknowledgment,
  deleteReference,
  errors,
  flawAcknowledgments,
  flawReferences,
  flawRhCvss3,
  highlightedNvdCvss3String,
  internalCommentsAvailable,
  isLoadingInternalComments,
  isSaving,
  isValid,
  loadInternalComments,
  nvdCvss3String,
  osimLink,
  rhCvss3String,
  saveAcknowledgments,
  saveReferences,
  shouldCreateJiraTask,
  shouldDisplayEmailNistForm,
  toggleShouldCreateJiraTask,
  updateFlaw,
} = useFlawModel(onSaveSuccess);
const { isFetchingAffects } = useFetchFlaw();

const { flaw, initialFlaw } = useFlaw();

const { draftFlaw } = useDraftFlawStore();

onMounted(() => {
  if (flaw.value.cve_id) {
    document.title = flaw.value.cve_id;
  }
  isEmbargoed.value = initialFlaw.value?.embargoed;
  if (draftFlaw) {
    flaw.value = useDraftFlawStore().addDraftFields(flaw.value);
    useDraftFlawStore().$reset();
  }
});

watch(() => flaw.value, () => { // Shallow watch so as to avoid reseting on any change (though that shouldn't happen)
  isEmbargoed.value = initialFlaw.value?.embargoed;
  shouldCreateJiraTask.value = false;
});

const isEmbargoed = ref<boolean>(false);
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

const onReset = () => {
  // is deepCopyFromRaw needed?
  flaw.value = deepCopyFromRaw(initialFlaw.value) as ZodFlawType;
  shouldCreateJiraTask.value = false;
};

const onUnembargoed = (isEmbargoed: boolean) => {
  if (!isEmbargoed && !flaw.value.unembargo_dt) {
    flaw.value.unembargo_dt = DateTime.now().toUTC().toISO();
  }
};

const hiddenSources = computed(() => {
  return flawSources.filter(source => !allowedSources.includes(source));
});

const referencesComp = ref<InstanceType<typeof IssueFieldReferences> | null>(null);
const acknowledgmentsComp = ref<InstanceType<typeof IssueFieldAcknowledgments> | null>(null);

const expandFocusedComponent = (parent_uuid: string) => {
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
      <div
        class="row px-4 my-3"
        :class="{'osim-flaw-form-embargoed border border-2 border-primary': flaw.embargoed}"
      >
        <div class="row osim-flaw-form-section pt-0">
          <div class="osim-flaw-form-header">
            <div class="osim-flaw-header-link">
              <a
                v-if="flaw.meta_attr?.bz_id"
                :href="bugzillaLink"
                target="_blank"
                rel="noopener noreferrer"
              >
                Open in Bugzilla <i class="bi-box-arrow-up-right ms-2" />
              </a>
              <a
                v-if="flaw.task_key"
                :href="jiraTaskUrl(flaw.task_key)"
                target="_blank"
              >
                Open in Jira <i class="bi-box-arrow-up-right ms-2" />
              </a>
            </div>

            <FlawAlertsList
              :flaw="flaw"
              class="col-12 osim-alerts-banner"
              @expandFocusedComponent="expandFocusedComponent"
            />
          </div>
          <div :id="flaw.uuid" class="col-6 flaw-form-subdivision">
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
                >
                  <template #label>
                    <a
                      v-if="!isEmbargoed && flaw.cve_id"
                      :href="`https://access.redhat.com/security/cve/${flaw.cve_id}`"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      CVE ID <i class="bi-box-arrow-up-right ms-2" />
                    </a>
                    <span v-else>
                      CVE ID
                    </span>
                  </template>
                </LabelEditable>
              </div>
              <div
                v-if="!(flaw.cve_id || '').includes('CVE') && mode === 'edit'"
                class="col-auto align-self-end mb-2"
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
              :options="flawImpactEnum"
              :error="errors.impact"
              :withBlank="true"
            />
            <CvssCalculator
              v-model:cvss-vector="flawRhCvss3.vector"
              v-model:cvss-score="flawRhCvss3.score"
            />
            <CvssSection
              :highlightedNvdCvss3String
              :shouldDisplayEmailNistForm
              :cveId="flaw.cve_id"
              :summary="flaw.comment_zero"
              :bugzilla="bugzillaLink"
              :cvss="rhCvss3String"
              :allCvss="flaw.cvss_scores"
              :nistCvss="nvdCvss3String"
            />
            <CweSelector
              v-model="flaw.cwe_id"
              label="CWE ID"
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
          <div class="col-6 flaw-form-subdivision">
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
              :options="MajorIncidentStateEnumWithBlank"
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
            <FlawFormOwner v-model="flaw.owner" :taskKey="flaw.task_key" />
            <LabelStatic
              v-if="mode === 'edit'"
              :modelValue="createdDate"
              label="Created Date"
            />
            <FlawContributors v-if="flaw.task_key" :taskKey="flaw.task_key" />
            <CvssExplainForm v-if="shouldDisplayEmailNistForm" v-model="flaw" />
          </div>
        </div>
        <div class="osim-flaw-form-section border-top row mx-0">
          <LabelTextarea
            v-model="flaw.comment_zero"
            label="Comment#0"
            placeholder="Comment#0 ..."
            :error="errors.comment_zero"
            :disabled="mode === 'edit'"
            class="col-6 px-4 py-2"
          />
          <LabelTextarea
            v-model="flaw.cve_description"
            label="Description"
            placeholder="Description Text ..."
            :error="errors.cve_description"
            class="col-6 px-4 py-2"
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
            v-model="flaw.statement"
            label="Statement"
            placeholder="Statement Text ..."
            :error="errors.statement"
            class="col-6 px-4 py-2"
          />
          <LabelTextarea
            v-model="flaw.mitigation"
            label="Mitigation"
            placeholder="Mitigation Text ..."
            :error="errors.mitigation"
            class="col-6 px-4 py-2"
          />
        </div>
        <div class="osim-flaw-form-section border-top border-bottom">
          <div class="d-flex gap-3">
            <IssueFieldReferences
              ref="referencesComp"
              v-model="flawReferences"
              class="w-100 my-2"
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
              class="w-100 my-2"
              :mode="mode"
              :error="errors.acknowledgments"
              @acknowledgment:update="saveAcknowledgments"
              @acknowledgment:new="addBlankAcknowledgment(flaw.embargoed)"
              @acknowledgment:cancel-new="cancelAddAcknowledgment"
              @acknowledgment:delete="deleteAcknowledgment"
            />
          </div>
        </div>
        <div class="osim-flaw-form-section">
          <FlawLabelsTable v-if="flaw.uuid" v-model="flaw.labels!" />
        </div>
        <div class="osim-flaw-form-section">
          <div v-if="isFetchingAffects">
            <LoadingSpinner
              type="border"
              class="spinner-border-sm me-1"
            />
            <span class="ms-1">Fetching affects...</span>
          </div>
          <FlawAffects
            v-else-if="mode === 'edit'"
            :errors="errors.affects"
            :embargoed="flaw.embargoed"
          />
        </div>
        <div v-if="mode === 'edit'" class="border-top osim-flaw-form-section">
          <FlawComments
            :commentsByType
            :internalCommentsAvailable
            :isLoadingInternalComments
            :taskKey="flaw.task_key || ''"
            :bugzillaLink
            :isSaving
            @comment:addFlawComment="addFlawComment"
            @loadInternalComments="loadInternalComments"
          />
        </div>
        <FlawHistory v-if="mode === 'edit'" :history="flaw.history" />
      </div>
    </div>
    <div class="osim-action-buttons sticky-bottom d-grid gap-2 d-flex justify-content-end">
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
      <div v-else-if="mode === 'create'">
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
    padding-block: 1.5rem;
  }

  .osim-flaw-form-header {
    min-height: 3rem;
    margin-block: 0.5rem;
  }

  .flaw-form-subdivision {
    max-width: 100ch;
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

.cvss-score-error {
  margin-top: -15px;
}

.osim-flaw-header-link {
  position: absolute;
  display: flex;
  flex-direction: column;
  right: 0;
  top: 0.25rem;
  width: auto;
}
</style>
