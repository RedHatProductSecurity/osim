<script setup lang="ts">
import { computed, ref, toRef, watch, onMounted } from 'vue';

import { DateTime } from 'luxon';

import IssueFieldEmbargo from '@/components/IssueFieldEmbargo/IssueFieldEmbargo.vue';
import CveRequestForm from '@/components/CveRequestForm/CveRequestForm.vue';
import FlawFormOwner from '@/components/FlawFormOwner/FlawFormOwner.vue';
import CvssSection from '@/components/CvssSection/CvssSection.vue';
import FlawWorkflowState from '@/components/FlawWorkflowState/FlawWorkflowState.vue';
import IssueFieldReferences from '@/components/IssueFieldReferences/IssueFieldReferences.vue';
import IssueFieldAcknowledgments from '@/components/IssueFieldAcknowledgments/IssueFieldAcknowledgments.vue';
import FlawComments from '@/components/FlawComments/FlawComments.vue';
import CvssCalculator from '@/components/CvssCalculator/CvssCalculator.vue';
import FlawAlertsList from '@/components/FlawAlertsList/FlawAlertsList.vue';
import FlawHistory from '@/components/FlawHistory/FlawHistory.vue';
import FlawContributors from '@/components/FlawContributors/FlawContributors.vue';
import CvssExplainForm from '@/components/CvssExplainForm/CvssExplainForm.vue';
import CweSelector from '@/components/CweSelector/CweSelector.vue';
import FlawLabelsTable from '@/components/FlawLabels/FlawLabelsTable.vue';
import AffectsTable from '@/components/AffectsTable/AffectsTable.vue';
import FlawFormImpact from '@/components/FlawForm/FlawFormImpact.vue';
import FlawMitigation from '@/components/FlawForm/FlawMitigation.vue';
import AegisTitleActions from '@/components/Aegis/AegisTitleActions.vue';
import AegisDescriptionActions from '@/components/Aegis/AegisDescriptionActions.vue';
import AegisStatementActions from '@/components/Aegis/AegisStatementActions.vue';
import AegisFeedbackModal from '@/components/Aegis/AegisFeedbackModal.vue';
import IncidentRequestButton from '@/components/IncidentRequestDialog/IncidentRequestButton.vue';
import UnprocessedFlawLabel from '@/components/UnprocessedFlawLabel/UnprocessedFlawLabel.vue';

import { useFlawModel } from '@/composables/useFlawModel';
import { useFlaw } from '@/composables/useFlaw';
import { useFetchFlaw } from '@/composables/useFetchFlaw';
import { useCvssScores } from '@/composables/useCvssScores';
import {
  aegisSuggestionRequestBody,
  type AegisSuggestionContextRefs,
} from '@/composables/aegis/useAegisSuggestionContext';
import { useAegisSuggestDescription } from '@/composables/aegis/useAegisSuggestDescription';
import { useAegisMetadataTracking } from '@/composables/aegis/useAegisMetadataTracking';
import { useComponentsFeedback, AegisFeedback } from '@/composables/aegis/useComponentsFeedback';
import { useAffectsModel } from '@/composables/useAffectsModel';

import { osimRuntime } from '@/stores/osimRuntime';
import type { ImpactEnumWithBlankType } from '@/types';
import LoadingSpinner from '@/widgets/LoadingSpinner/LoadingSpinner.vue';
import LabelTextarea from '@/widgets/LabelTextarea/LabelTextarea.vue';
import LabelStatic from '@/widgets/LabelStatic/LabelStatic.vue';
import LabelSelect from '@/widgets/LabelSelect/LabelSelect.vue';
import LabelTagsInput from '@/widgets/LabelTagsInput/LabelTagsInput.vue';
import LabelEditable from '@/widgets/LabelEditable/LabelEditable.vue';
import LabelDiv from '@/widgets/LabelDiv/LabelDiv.vue';
import EditableText from '@/widgets/EditableText/EditableText.vue';
import {
  MajorIncidentStateEnumWithBlank,
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
  internalCommentsAvailable,
  isLoadingInternalComments,
  isSaving,
  isValid,
  loadInternalComments,
  osimLink,
  saveAcknowledgments,
  saveReferences,
  shouldCreateJiraTask,
  toggleShouldCreateJiraTask,
  updateFlaw,
} = useFlawModel();
const {
  currentlyFetchedAffectCount,
  fetchedAffectsPercentage,
  historyFetchError,
  isFetchingAffects,
  totalAffectCount,
} = useFetchFlaw();
const { flaw, initialFlaw } = useFlaw();

const {
  highlightedNvdCvssString,
  nvdCvssString,
  rhCvssString,
  shouldDisplayEmailNistForm,
} = useCvssScores();

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

const isIncidentStateDisabled = computed(() =>
  props.mode === 'edit'
  && !flaw.value.major_incident_state,
);

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
  useAffectsModel().actions.initializeAffects(flaw.value.affects);

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

// Hide blank option if there is already a value
const hiddenIncidentStates = computed(() => initialFlaw.value?.major_incident_state ? [''] : []);

const referencesComp = ref<InstanceType<typeof IssueFieldReferences> | null>(null);
const acknowledgmentsComp = ref<InstanceType<typeof IssueFieldAcknowledgments> | null>(null);

async function handleSaveReferences(references: any[]) {
  await saveReferences(references);
  referencesComp.value?.editableListComp?.onSaveComplete();
}

async function handleSaveAcknowledgments(acknowledgments: any[]) {
  await saveAcknowledgments(acknowledgments);
  acknowledgmentsComp.value?.editableListComp?.onSaveComplete();
}

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

const aegisContext: AegisSuggestionContextRefs = aegisSuggestionRequestBody(flaw);

const titleRefForAegis = toRef(flaw.value, 'title');
const descriptionRefForAegis = toRef(flaw.value, 'cve_description');

const aegisSuggestDescriptionComposable = useAegisSuggestDescription({
  context: aegisContext,
  titleRef: titleRefForAegis,
  descriptionRef: descriptionRefForAegis,
});

const { getAIBotTooltip, isFieldValueAIBot } = useAegisMetadataTracking();

const {
  canShowComponentsFeedback,
  handleComponentsFeedback,
  handleFeedbackCancel: handleComponentsFeedbackCancel,
  handleFeedbackSubmit: handleComponentsFeedbackSubmit,
  showComponentsFeedbackModal,
} = useComponentsFeedback(computed(() => flaw.value.components));

// Helper function to check if an array field was populated by AI-Bot
const isArrayFieldValueAIBot = (fieldName: string, currentValue: null | string[] | undefined): boolean => {
  if (!currentValue) return false;

  return isFieldValueAIBot(fieldName, currentValue);
};

// Tooltip state for components field
const showComponentsTooltip = ref(false);
const componentsTooltipText = computed(() => {
  if (!isArrayFieldValueAIBot('components', flaw.value.components)) return '';
  const tooltip = getAIBotTooltip('components');
  return tooltip.replace(/<br><br>/g, '\n\n');
});
const toggleComponentsTooltip = () => {
  showComponentsTooltip.value = !showComponentsTooltip.value;
};
</script>

<template>
  <form class="osim-flaw-form mt-4" :class="{'osim-disabled': isSaving || formDisabled}" @submit.prevent="onSubmit">
    <div :class="{'osim-flaw-form-embargoed': flaw.embargoed}">
      <div class="row justify-content-end">
        <FlawAlertsList
          :flaw="flaw"
          class="col-12 osim-alerts-banner"
          @expandFocusedComponent="expandFocusedComponent"
        />
        <div class="text-end osim-flaw-header-link">
          <div class="d-flex justify-content-end align-items-center gap-2 mb-1">
            <UnprocessedFlawLabel :flaw="flaw" variant="inline" />
            <a
              v-if="flaw.meta_attr?.bz_id"
              :href="bugzillaLink"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open in Bugzilla <i class="bi-box-arrow-up-right ms-2" />
            </a>
          </div>
          <a
            v-if="flaw.task_key"
            :href="jiraTaskUrl(flaw.task_key)"
            target="_blank"
            class="d-block"
          >
            Open in Jira <i class="bi-box-arrow-up-right ms-2" />
          </a>
        </div>
      </div>
      <div class="row osim-flaw-form-section">
        <div :id="flaw.uuid" class="col-6">
          <LabelDiv
            label="Title"
            :loading="aegisSuggestDescriptionComposable.isSuggesting.value"
            :highlighted="isFieldValueAIBot('title', flaw.title)"
            class="mb-2"
          >
            <template #labelSlot>
              <div class="d-flex align-items-center">
                <i
                  v-if="isFieldValueAIBot('title', flaw.title)"
                  class="bi bi-robot text-primary me-1"
                ></i>
                <AegisTitleActions
                  :composable="aegisSuggestDescriptionComposable"
                  :titleValue="flaw.title"
                />
              </div>
            </template>
            <EditableText
              v-model="flaw.title"
              class="col-12"
              :error="errors.title"
            />
          </LabelDiv>
          <LabelTagsInput
            v-model="flaw.components"
            label="Source Component"
            :error="errors.components"
            :highlighted="isArrayFieldValueAIBot('components', flaw.components)"
          >
            <template #label>
              <div class="d-flex align-items-center flex-wrap justify-content-end">
                <i
                  v-if="isArrayFieldValueAIBot('components', flaw.components)"
                  class="bi bi-robot text-primary me-1"
                ></i>
                <!-- Info icon for AI-Bot tooltip -->
                <span
                  v-if="isArrayFieldValueAIBot('components', flaw.components)"
                  class="position-relative me-1"
                >
                  <i
                    class="bi bi-info-circle"
                    style="color: #6c757d; cursor: pointer; font-size: 0.9em;"
                    title="Show explanation"
                    @click.prevent.stop="toggleComponentsTooltip"
                  ></i>
                  <!-- eslint-disable vue/no-v-html -->
                  <div
                    v-if="showComponentsTooltip"
                    class="aegis-tooltip"
                    v-html="componentsTooltipText.replace(/\n/g, '<br>')"
                  ></div>
                  <!-- eslint-enable vue/no-v-html -->
                </span>
                <!-- Feedback buttons for Aegis-AI-Bot highlighted components -->
                <template v-if="canShowComponentsFeedback">
                  <i
                    class="bi-hand-thumbs-up me-1"
                    style="color: gray; cursor: pointer; font-size: 0.9em;"
                    title="Mark suggestion helpful"
                    @click.prevent.stop="handleComponentsFeedback(AegisFeedback.POSITIVE, '')"
                  />
                  <i
                    class="bi-hand-thumbs-down me-1"
                    style="color: gray; cursor: pointer; font-size: 0.9em;"
                    title="Mark suggestion unhelpful"
                    @click.prevent.stop="showComponentsFeedbackModal = true"
                  />
                </template>
                <span style="font-size: 0.95em; white-space: nowrap;">Source Component</span>
              </div>
            </template>
          </LabelTagsInput>
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
          <FlawFormImpact
            v-model="flaw.impact as ImpactEnumWithBlankType"
            :aegisContext="aegisContext"
            :error="errors.impact"
            :initialImpact="initialFlaw.impact ?? null"
            :workflowState="flaw.classification?.state ?? ''"
          />
          <CvssCalculator :aegisContext="aegisContext" />
          <CvssSection
            :highlightedNvdCvssString
            :shouldDisplayEmailNistForm
            :cveId="flaw.cve_id"
            :summary="flaw.comment_zero"
            :bugzilla="bugzillaLink"
            :cvss="rhCvssString"
            :allCvss="flaw.cvss_scores"
            :nistCvss="nvdCvssString"
          />
          <CweSelector
            v-model="flaw.cwe_id"
            label="CWE ID"
            :error="errors.cwe_id"
            :aegis-context="aegisContext"
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
          <FlawWorkflowState
            v-if="mode === 'edit'"
            :classification="flaw.classification"
            :flawId="flaw.uuid"
            :shouldCreateJiraTask
            @refresh:flaw="emit('refresh:flaw')"
            @create:jiraTask="toggleShouldCreateJiraTask()"
          />
          <div class="osim-incident-state-container mb-2">
            <LabelSelect
              v-model="flaw.major_incident_state"
              label="Incident State"
              :options="MajorIncidentStateEnumWithBlank"
              :error="errors.major_incident_state"
              :optionsHidden="hiddenIncidentStates"
              :disabled="isIncidentStateDisabled"
            />
            <IncidentRequestButton
              :mode="mode"
              :flawUuid="flaw.uuid"
              :majorIncidentState="flaw.major_incident_state"
              @requestSubmitted="emit('refresh:flaw')"
            />
          </div>
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
          <FlawFormOwner v-model="flaw.owner" :taskKey="flaw.task_key" :error="errors.owner" />
          <LabelStatic
            v-if="mode === 'edit'"
            :modelValue="createdDate"
            label="Created Date"
          />
          <FlawContributors v-if="flaw.task_key" :taskKey="flaw.task_key" />
          <CvssExplainForm v-if="shouldDisplayEmailNistForm" v-model="flaw" />
        </div>
      </div>
      <div class="osim-flaw-form-section border-top row">
        <div class="col-6">
          <LabelTextarea
            v-model="flaw.comment_zero"
            label="Comment#0"
            placeholder="Comment#0 ..."
            :error="errors.comment_zero"
            :disabled="mode === 'edit'"
          />
        </div>
        <div class="col-6">
          <LabelTextarea
            v-model="flaw.cve_description"
            label="Description"
            placeholder="Description Text ..."
            :error="errors.cve_description"
            :loading="aegisSuggestDescriptionComposable.isSuggesting.value"
          >
            <template #label>
              <span
                class="form-label col-3 osim-folder-tab-label position-relative"
                :class="{
                  'border-start border-primary border-3 bg-primary bg-opacity-10 ps-2':
                    isFieldValueAIBot('cve_description', flaw.cve_description)
                }"
              >
                <div class="d-flex align-items-center">
                  <span
                    v-if="aegisSuggestDescriptionComposable.isSuggesting.value"
                    v-osim-loading.grow="aegisSuggestDescriptionComposable.isSuggesting.value"
                    class="throbber"
                  />
                  <i
                    v-if="isFieldValueAIBot('cve_description', flaw.cve_description)"
                    class="bi bi-robot text-primary me-1"
                  ></i>
                  <AegisDescriptionActions
                    :composable="aegisSuggestDescriptionComposable"
                    :descriptionValue="flaw.cve_description"
                  />
                  <span>Description</span>
                </div>
              </span>
            </template>
          </LabelTextarea>
        </div>
        <div class="col-6">
          <LabelTextarea
            v-model="flaw.statement"
            label="Statement"
            placeholder="Statement Text ..."
            :error="errors.statement"
          >
            <template #label>
              <span
                class="form-label col-3 osim-folder-tab-label position-relative"
                :class="{
                  'border-start border-primary border-3 bg-primary bg-opacity-10 ps-2':
                    isFieldValueAIBot('statement', flaw.statement)
                }"
              >
                <div class="d-flex align-items-center">
                  <i
                    v-if="isFieldValueAIBot('statement', flaw.statement)"
                    class="bi bi-robot text-primary me-1"
                  ></i>
                  <AegisStatementActions
                    v-model="flaw.statement"
                    :aegisContext="aegisContext"
                  />
                  <span>Statement</span>
                </div>
              </span>
            </template>
          </LabelTextarea>
        </div>
        <div class="col-6">
          <FlawMitigation
            v-model="flaw.mitigation"
            :aegisContext="aegisContext"
            :error="errors.mitigation"
          />
        </div>

      </div>
      <div class="row osim-flaw-form-section border-top border-bottom">
        <IssueFieldReferences
          ref="referencesComp"
          v-model="flawReferences"
          class="col-6"
          :mode="mode"
          :error="errors.references"
          @reference:update="handleSaveReferences"
          @reference:new="addBlankReference(flaw.embargoed)"
          @reference:cancel-new="cancelAddReference"
          @reference:delete="deleteReference"
        />
        <IssueFieldAcknowledgments
          ref="acknowledgmentsComp"
          v-model="flawAcknowledgments"
          class="col-6"
          :mode="mode"
          :error="errors.acknowledgments"
          @acknowledgment:update="handleSaveAcknowledgments"
          @acknowledgment:new="addBlankAcknowledgment(flaw.embargoed)"
          @acknowledgment:cancel-new="cancelAddAcknowledgment"
          @acknowledgment:delete="deleteAcknowledgment"
        />
      </div>
      <div v-if="mode === 'edit'" id="affected-offerings" class="row osim-flaw-form-section">
        <h4>Affected Offerings</h4>
        <div class="col">
          <div v-if="isFetchingAffects">
            <template v-if="totalAffectCount <= 100">
              <LoadingSpinner
                type="border"
                class="spinner-border-sm me-1"
              />
              <span class="ms-1">Loading affects...</span>
            </template>
            <template v-else>
              <span>Loading {{ totalAffectCount }} affects...</span>
              <div
                v-if="totalAffectCount >= 100"
                class="mt-1 progress"
                role="progressbar"
                aria-label="Example with label"
                :aria-valuenow="fetchedAffectsPercentage"
                :style="{width: '160px'}"
                aria-valuemin="0"
                aria-valuemax="100"
              >
                <div
                  class="progress-bar progress-bar-striped progress-bar-animated"
                  :style="{width: `${fetchedAffectsPercentage}%`,}"
                >{{ currentlyFetchedAffectCount }}</div>
              </div>
            </template>
          </div>
          <AffectsTable v-else />
        </div>
      </div>
      <div class="row osim-flaw-form-section">
        <FlawLabelsTable v-if="flaw.uuid" v-model="flaw.labels!" />
      </div>
      <div v-if="mode === 'edit'" class="row border-top osim-flaw-form-section">
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
      <div class="row border-top">
        <div class="col">
          <FlawHistory
            v-if="mode === 'edit'"
            :disabled="!osimRuntime.flags?.flawHistory"
            :history="flaw.history"
            :error="historyFetchError"
          />
        </div>
      </div>
    </div>
    <div class="osim-action-buttons sticky-bottom d-flex justify-content-end">
      <template v-if="mode === 'edit'">
        <button type="button" class="btn btn-secondary" @click="onReset">Reset Changes</button>
        <button
          v-osim-loading.grow="isSaving"
          type="submit"
          class="btn btn-primary ms-3"
          :disabled="isSaving"
        >
          Save Changes
        </button>
      </template>
      <template v-else-if="mode === 'create'">
        <button
          v-osim-loading.grow="isSaving"
          type="submit"
          class="btn btn-primary ms-3"
          :disabled="isSaving"
        >
          Create New Flaw
        </button>
      </template>
    </div>
  </form>

  <!-- Components Feedback Modal -->
  <AegisFeedbackModal
    :show="showComponentsFeedbackModal"
    @submit="handleComponentsFeedbackSubmit"
    @cancel="handleComponentsFeedbackCancel"
  />
</template>

<style scoped lang="scss">
.osim-flaw-header-link {
  display: flex;
  flex-direction: column;
  width: auto;

  .osim-alerts-banner + & {
    position: absolute;
  }
}

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
  z-index: 1029; // Bootstrap 'sticky' sets index to 1020, but we want this one to be on top of every other sticky
  background: white;
  border-top: 1px solid #ddd;
  padding-right: 20px;
  padding-bottom: calc(var(--osim-status-bar-height) + 0.5rem);
  padding-top: 0.5rem;
  margin-top: 0.5rem;
  margin-left: calc(-0.5 * var(--bs-gutter-x));
  margin-right: calc(-0.5 * var(--bs-gutter-x));
}

.osim-doc-text-container {
  max-width: 80ch;
}

.cvss-score-error {
  margin-top: -15px;
}

.osim-flaw-form-embargoed {
  position: relative;
}

.osim-flaw-form-embargoed::after {
  content: ' ';
  position: absolute;
  border: 2px solid;
  border-color: rgba(var(--bs-primary-rgb));
  inset: -1rem -1.5rem 0;
  z-index: -1;
}

.throbber {
  position: absolute;
  left: 1rem;
}

.osim-incident-state-container {
  position: relative;

  :deep(.osim-incident-request-btn) {
    position: absolute;
    right: 0;
    bottom: 0;
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
    border-left: 0;
    height: 38px;
  }

  :deep(.osim-input select) {
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
  }
}

.bi-hand-thumbs-up,
.bi-hand-thumbs-down {
  &:hover:not(.disabled) {
    color: #333;
  }

  &.bi-hand-thumbs-up:hover {
    color: #198754;
  }

  &.bi-hand-thumbs-down:hover {
    color: #dc3545;
  }
}

.aegis-tooltip {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-top: 5px;
  padding: 8px 12px;
  background-color: #333;
  color: white;
  border-radius: 4px;
  font-size: 0.875rem;
  white-space: normal;
  z-index: 1000;
  box-shadow: 0 2px 8px rgb(0 0 0 / 15%);
  min-width: 350px;
  max-width: 500px;
  max-height: 300px;
  overflow-y: auto;
}
</style>
