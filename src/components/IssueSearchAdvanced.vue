<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';

import { sort } from 'ramda';
// @ts-expect-error missing types
import DjangoQL from 'djangoql-completion';

import Modal from '@/components/widgets/Modal.vue';
import QueryFilterGuide from '@/components/QueryFilterGuide.vue';

import { useModal } from '@/composables/useModal';
import { useSearchParams } from '@/composables/useSearchParams';

import { flawImpacts, flawSources, flawIncidentStates, descriptionRequiredStates } from '@/types/zodFlaw';
import { flawFields } from '@/constants/flawFields';
import { affectAffectedness } from '@/types/zodAffect';
import { osimRuntime } from '@/stores/osimRuntime';

const props = defineProps<{
  isLoading: boolean;
}>();
const emit = defineEmits(['filter:save']);
const { facets, query, removeFacet, submitAdvancedSearch } = useSearchParams();
const { closeModal, isModalOpen, openModal } = useModal();

const queryFilterVisible = ref(true);

const emptinessSupportedFields = ['cve_id', 'cve_description', 'statement', 'mitigation', 'owner', 'cwe_id'];

const djangoCompletion = ref();

const nameForOption = (fieldName: string) => {
  const mappings: Record<string, string> = {
    uuid: 'UUID',
    cvss_scores__score: 'CVSS Score',
    cvss_scores__vector: 'CVSS Vector',
    affects__ps_module: 'Affected Module',
    affects__ps_component: 'Affected Component',
    affects__affectedness: 'Affected Affectedness',
    affects__trackers__ps_update_stream: 'Affect Update Stream',
    acknowledgments__name: 'Acknowledgment Author',
    affects__trackers__errata__advisory_name: 'Errata Advisory Name',
    affects__trackers__external_system_id: 'Tracker External System ID',
    workflow_state: 'Flaw State',
    cwe_id: 'CWE ID',
    cve_id: 'CVE ID',
    source: 'CVE Source',
    cve_description: 'CVE Description',
    requires_cve_description: 'CVE Description Review',
    major_incident_state: 'Incident State',
  };
  let name =
    mappings[fieldName]
    || fieldName.replace(/__[a-z]/g, label => `: ${label.charAt(2).toUpperCase()}`);
  name = name.replace(/_/g, ' ');
  return name.charAt(0).toUpperCase() + name.slice(1);
};

const sortFieldNames = sort((fieldA: string, fieldB: string) =>
  nameForOption(fieldA).localeCompare(nameForOption(fieldB)),
);

const chosenFields = computed(() => facets.value.map(({ field }) => field));

const unchosenFields = (chosenField: string) =>
  sortFieldNames(flawFields.filter(field => !chosenFields.value.includes(field) || field === chosenField));

const optionsFor = (field: string) =>
  ({
    source: flawSources,
    impact: flawImpacts,
    requires_cve_description: descriptionRequiredStates,
    embargoed: ['true', 'false'],
    workflow_state: [
      'DONE',
      'NEW',
      'PRE_SECONDARY_ASSESSMENT',
      'REJECTED',
      'SECONDARY_ASSESSMENT',
      'TRIAGE',
    ],
    major_incident_state: flawIncidentStates,
    affects__affectedness: affectAffectedness,
  })[field] || null;

const shouldShowAdvanced = ref(true);

watch(queryFilterVisible, () => {
  if (!queryFilterVisible.value) {
    query.value = '';
  }
});

onMounted(() => {
  const djangoQL = new DjangoQL({
    completionEnabled: true,
    introspections: `${osimRuntime.value.backends.osidb}/osidb/api/v1/introspection`,
    selector: 'textarea#query',
    autoResize: true,
    syntaxHelp: null,
    onSubmit: function (value: string) {
      query.value = value;
      submitAdvancedSearch();
    },
  });

  djangoQL.popupCompletion();

  djangoCompletion.value = djangoQL;
});

onUnmounted(() => {
  if (djangoCompletion.value) {
    djangoCompletion.value.destroyCompletionElement();
  }
});
</script>

<template>
  <details :open="shouldShowAdvanced" class="osim-advanced-search-container container-fluid">
    <summary class="mb-1" @click="shouldShowAdvanced = true">Advanced Search</summary>
    <form class="mb-2" @submit.prevent="submitAdvancedSearch">
      <div v-if="queryFilterVisible" class="input-group my-1">
        <div type="button" class="form-control bg-secondary text-white pe-none py-0 d-flex" style="max-width: 13.125%;">
          <span class="my-auto">Query Filter</span>
          <button class="btn btn-sm p-0 ms-auto my-auto text-white pe-auto border-0" type="button" @click="openModal()">
            <i class="bi bi-question-circle-fill fs-5" aria-label="hide query filter" />
          </button>
        </div>
        <textarea
          id="query"
          v-model="query"
          type="text"
          class="form-control"
        />
        <button
          class="btn btn-sm btn-secondary rounded-0 py-0"
          title="Clear query"
          type="button"
          @click="query = ''"
        >
          <i class="bi bi-eraser fs-5"></i>
        </button>
        <button class="btn btn-secondary py-0" type="button" @click="() => queryFilterVisible = false">
          <i class="bi bi-x fs-5" aria-label="hide query filter" />
        </button>
      </div>
      <div v-for="(facet, index) in facets" :key="facet.field" class="input-group my-1">
        <select v-model="facet.field" class="form-select search-facet-field" @submit.prevent>
          <option
            v-if="!facet.field"
            selected
            value=""
            disabled
          >Select field...</option>
          <option v-for="field in unchosenFields(facet.field)" :key="field" :value="field">
            {{ nameForOption(field) }}
          </option>
        </select>
        <select
          v-if="optionsFor(facet.field)"
          v-model="facet.value"
          class="form-select"
          @submit.prevent
        >
          <option v-for="option in optionsFor(facet.field)" :key="option" :value="option">
            {{ option }}
          </option>
        </select>
        <input
          v-else
          v-model="facet.value"
          type="text"
          class="form-control"
          :disabled="!facet.field"
        />
        <div v-if="emptinessSupportedFields.includes(facet.field)" class="btn-group">
          <button
            class="btn btn-sm btn-primary rounded-0 py-0"
            title="Non empty field search"
            type="button"
            :disabled="facet.value === 'isempty'"
            @click="facet.value = 'isempty'"
          >
            <i class="bi bi-circle fs-5" />
          </button>
          <button
            class="btn btn-sm btn-primary rounded-0 py-0"
            title="Empty field search"
            type="button"
            :disabled="facet.value === 'nonempty'"
            @click="facet.value = 'nonempty'"
          >
            <i class="bi bi-slash-circle fs-5" />
          </button>
        </div>
        <button
          class="btn btn-sm btn-primary rounded-0 py-0"
          title="Clear field"
          type="button"
          @click="facet.value = ''"
        >
          <i class="bi bi-eraser fs-5"></i>
        </button>
        <button class="btn btn-primary py-0" type="button" @click="removeFacet(index)">
          <i class="bi-x fs-5" aria-label="remove field"></i>
        </button>
      </div>
      <div class="mt-2">
        <button class="btn btn-primary me-2" type="submit" :disabled="props.isLoading">
          <div v-if="props.isLoading" class="spinner-border spinner-border-sm"></div>
          Search
        </button>
        <button
          class="btn btn-primary me-2"
          type="button"
          :disabled="isLoading"
          @click="emit('filter:save')"
        >
          Save as Default
        </button>
        <button
          v-if="!queryFilterVisible"
          class="btn btn-secondary"
          type="button"
          @click="() => queryFilterVisible = true"
        >
          Show Query Filter
        </button>
      </div>
    </form>
  </details>
  <Modal :show="isModalOpen" style="max-width: 75%;" @close="closeModal()">
    <template #header>
      <h1>Query Filter Guide</h1>
      <button
        type="button"
        class="btn-close ms-auto"
        aria-label="Close"
        @click="closeModal()"
      />
    </template>
    <template #body>
      <QueryFilterGuide />
    </template>
    <template #footer>
      <button
        type="button"
        class="btn btn-secondary m-0"
        @click="closeModal()"
      >
        Close
      </button>
    </template>
  </Modal>
</template>

<style lang="scss" scoped>
.osim-advanced-search-container {
  width: 97.5%;

  i {
    cursor: pointer;
  }

  select.search-facet-field {
    display: flex;
    width: auto;
    flex-grow: 0;
  }
}
</style>

<style lang="scss">
@import '@/scss/djangoql';
@import 'djangoql-completion/dist/completion.css';
</style>
