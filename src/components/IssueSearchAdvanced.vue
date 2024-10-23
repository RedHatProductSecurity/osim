<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import { sort } from 'ramda';

import Modal from '@/components/widgets/Modal.vue';
import QueryFilterGuide from '@/components/QueryFilterGuide.vue';
import DjangoQLInput from '@/components/DjangoQLInput.vue';

import { useModal } from '@/composables/useModal';
import { useSearchParams } from '@/composables/useSearchParams';

import { flawImpacts, flawSources, flawIncidentStates, descriptionRequiredStates } from '@/types/zodFlaw';
import { allowedEmptyFieldMapping, flawFields } from '@/constants/flawFields';
import { affectAffectedness } from '@/types/zodAffect';
import { type SearchSchema } from '@/stores/SearchStore';

const props = defineProps<{
  isLoading: boolean;
  loadedSearch: number;
  savedSearches: SearchSchema[];
}>();

const emit = defineEmits<{
  'filter:delete': [];
  'filter:save': [];
  'filter:update': [];
  'savedSearch:select': [index: number];
}>();

const {
  facets,
  orderField,
  orderMode,
  query,
  removeFacet,
  submitAdvancedSearch,
  toggleSortOrder,
} = useSearchParams();

const { closeModal, isModalOpen, openModal } = useModal();

const queryFilterVisible = ref(true);

const emptinessSupportedFields = Object.keys(allowedEmptyFieldMapping);

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

const customSortingFields = [
  'cvss_scores__score',
  'cwe_id',
  'major_incident_state',
  'source',
];

const fieldNamesSorted = sort((fieldA: string, fieldB: string) =>
  nameForOption(fieldA).localeCompare(nameForOption(fieldB)),
);

const chosenFields = computed(() => facets.value.map(({ field }) => field));

const unchosenFields = (chosenField: string) =>
  fieldNamesSorted(flawFields.filter(field => !chosenFields.value.includes(field) || field === chosenField));

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
const showSavedSearches = ref(true);

watch(queryFilterVisible, () => {
  if (!queryFilterVisible.value) {
    query.value = '';
  }
});

function handleToggleOrder() {
  toggleSortOrder();
  submitAdvancedSearch();
}
</script>

<template>
  <details :open="shouldShowAdvanced" class="osim-advanced-search-container container-fluid">
    <summary class="mb-1" @click="shouldShowAdvanced = true">Advanced Search</summary>
    <form class="mb-2" @submit.prevent="submitAdvancedSearch">
      <div v-show="queryFilterVisible" class="input-group my-1">
        <div type="button" class="query-input form-control bg-secondary text-white">
          <span class="my-auto">Query Filter</span>
          <button class="btn btn-sm text-white" type="button" @click="openModal()">
            <i class="bi bi-question-circle-fill fs-5" aria-label="hide query filter" />
          </button>
        </div>
        <DjangoQLInput v-model="query" @submit="submitAdvancedSearch()" />
        <button
          :disabled="!query"
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
            title="Empty field search"
            type="button"
            :disabled="facet.value === 'isempty'"
            @click="facet.value = 'isempty'"
          >
            <i class="bi bi-circle fs-5" />
          </button>
          <button
            class="btn btn-sm btn-primary rounded-0 py-0"
            title="Non empty field search"
            type="button"
            :disabled="facet.value === 'nonempty'"
            @click="facet.value = 'nonempty'"
          >
            <i class="bi bi-slash-circle fs-5" />
          </button>
        </div>
        <button
          v-if="facet.field"
          :disabled="!facet.value"
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
      <div class="d-flex mt-2">
        <button
          class="btn btn-primary me-2"
          type="submit"
          style="width: 23ch;"
          :disabled="props.isLoading"
          aria-label="Advance search button"
        >
          <div v-if="props.isLoading" class="spinner-border spinner-border-sm"></div>
          Search
        </button>
        <button
          v-if="!queryFilterVisible"
          class="btn btn-secondary me-2"
          type="button"
          @click="() => queryFilterVisible = true"
        >
          Show Query Filter
        </button>
        <select
          v-model="orderField"
          class="sort-by-select form-select search-facet-field"
          :class="{ 'active': orderField }"
          :title="'When using this sorting with active table column sort,'
            +' the table column field will be used as secondary sorting key'"
          @submit.prevent
          @change="submitAdvancedSearch()"
        >
          <option selected disabled label="Sort By..." />
          <option :hidden="!orderField" label="" value="" />
          <option v-for="field in customSortingFields" :key="field" :value="field">
            {{ nameForOption(field) }}
          </option>
        </select>
        <button
          v-if="orderField"
          class="sort-by-order btn btn-sm"
          @click.prevent="handleToggleOrder()"
        >
          <i
            :class="{
              'bi-caret-up-fill': orderMode === 'asc',
              'bi-caret-down-fill': orderMode === 'desc',
            }"
            :title="orderMode === 'asc' ? 'Ascending order' : 'Descending order'"
            class="bi fs-5"
          />
        </button>
      </div>
    </form>
  </details>
  <details
    :open="showSavedSearches"
    class="osim-advanced-search-container container-fluid"
  >
    <summary @click="showSavedSearches === true"> Saved Searches</summary>
    <div class="d-flex mt-2">
      <template v-for="(savedSearch, index) in savedSearches" :key="index">
        <button
          :title="'Query: ' + savedSearch.queryFilter + '\nFields: '
            + Object.entries(savedSearch.searchFilters).map(([key, value]) => `${key}: ${value}`).join(', ')"
          class="btn me-2"
          :class="index === loadedSearch ? 'btn-secondary' : 'border'"
          type="button"
          @click="emit('savedSearch:select', index)"
        >
          Slot {{ index + 1 }}
        </button>
      </template>
    </div>
    <span v-if="savedSearches.length === 0" class="ms-2">No saved searches</span>
    <div class="d-flex mt-2">
      <button
        class="btn btn-primary me-2"
        aria-label="Save filters as default"
        type="button"
        :disabled="isLoading"
        @click="emit('filter:save')"
      >
        Save Search
      </button>
      <button
        v-if="loadedSearch !== -1"
        class="btn btn-secondary me-2"
        aria-label="Save filters as default"
        type="button"
        :disabled="isLoading"
        @click="emit('filter:update')"
      >
        Update Slot {{ loadedSearch + 1 }}
      </button>
      <button
        v-if="loadedSearch !== -1"
        class="btn btn-secondary me-2"
        aria-label="Save filters as default"
        type="button"
        :disabled="isLoading"
        @click="emit('filter:delete')"
      >
        Delete Slot {{ loadedSearch + 1 }}
      </button>
    </div>
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

  .query-input {
    display: flex;
    max-width: 241.5px;
    pointer-events: none;
    padding-block: 0;

    button {
      padding: 0;
      margin-left: auto;
      margin-block: auto;
      pointer-events: auto;
      border: 0;
    }
  }

  .sort-by-select.active {
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
  }

  .sort-by-order {
    border: 1px solid #dee2e6;
    border-left: 0;
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;

    &:hover {
      color: red;
      border: 1px solid #dee2e6;
      border-left: 0;
    }
  }

  select.search-facet-field {
    display: flex;
    width: auto;
    flex-grow: 0;
  }

  select.sort-by-search {
    min-width: 160.75px;
  }

  .search-btn {
    width: 241.5px;
  }
}
</style>

<style lang="scss">
@import '@/scss/djangoql';
@import '@mrmarble/djangoql-completion/dist/index.css';
</style>
