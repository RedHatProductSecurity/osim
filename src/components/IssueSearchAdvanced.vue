<script setup lang="ts">
import { computed, ref } from 'vue';
import { flawImpacts, flawSources } from '@/types/zodFlaw';
import { useRoute } from 'vue-router';
import { flawFields } from '@/constants/flawFields';
import { useSearchParams } from '@/composables/useSearchParams';
import { summaryRequiredStates } from '@/types/zodFlaw';
import { sort } from 'ramda';

const { facets, removeFacet, submitAdvancedSearch } = useSearchParams();

const props = defineProps<{
  isLoading: boolean;
}>();

const route = useRoute();

const emit = defineEmits(['filter:save']);

const nameForOption = (fieldName: string) => {
  const mappings: Record<string, string> = {
    uuid: 'UUID',
    cvss_scores__score: 'CVSS Score',
    cvss_scores__vector: 'CVSS Vector',
    affects__ps_module: 'Affected Module',
    affects__ps_component: 'Affected Component',
    affects__trackers__ps_update_stream: 'Affect Update Stream',
    acknowledgments__name: 'Acknowledgment Author',
    affects__trackers__errata__advisory_name: 'Errata Advisory Name',
    affects__trackers__external_system_id: 'Tracker External System ID',
    workflow_state: 'Flaw Status',
    cwe_id: 'CWE ID',
    cve_id: 'CVE ID',
    source: 'CVE Source',
    requires_summary: 'CVE Description Review',
  };
  let name =
    mappings[fieldName]
    || fieldName.replace(/__[a-z]/g, (label) => `: ${label.charAt(2).toUpperCase()}`);
  name = name.replace(/_/g, ' ');
  return name.charAt(0).toUpperCase() + name.slice(1);
};

const sortFieldNames = sort((fieldA: string, fieldB: string) =>
  nameForOption(fieldA).localeCompare(nameForOption(fieldB))
);

const chosenFields = computed(() => facets.value.map(({ field }) => field));

const unchosenFields = (chosenField: string) =>
  sortFieldNames(flawFields.filter((field) => !chosenFields.value.includes(field) || field === chosenField));


const optionsFor = (field: string) =>
  ({
    source: flawSources,
    impact: flawImpacts,
    requires_summary: summaryRequiredStates,
    embargoed: ['true', 'false'],
    workflow_state: [
      'DONE',
      'NEW',
      'PRE_SECONDARY_ASSESSMENT',
      'REJECTED',
      'SECONDARY_ASSESSMENT',
      'TRIAGE',
    ],
  })[field] || null;
const shouldShowAdvanced = ref(route.query.mode === 'advanced');
</script>

<template>
  <details :open="shouldShowAdvanced" class="osim-advanced-search-container">
    <summary class="mb-2" @click="shouldShowAdvanced = true">Advanced Search</summary>
    <form class="mb-2" @submit.prevent="submitAdvancedSearch">
      <div v-for="(facet, index) in facets" :key="facet.field" class="input-group mb-2">
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
        <button class="btn btn-outline-primary" type="button" @click="removeFacet(index)">
          <i class="bi-x" aria-label="remove field"></i>
        </button>
      </div>
      <button class="btn btn-primary me-3" type="submit" :disabled="props.isLoading">
        <div v-if="props.isLoading" class="spinner-border spinner-border-sm"></div>
        Search
      </button>
      <button
        class="btn btn-primary me-3"
        type="button"
        :disabled="isLoading"
        @click="emit('filter:save')"
      >
        Save as Default
      </button>
    </form>
  </details>
</template>

<style lang="scss" scoped>
.osim-advanced-search-container {
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
