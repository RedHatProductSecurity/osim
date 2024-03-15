<script setup lang="ts">
const props = defineProps<{
  // eslint-disable-next-line @typescript-eslint/ban-types
  setIssues: Function;
}>();
import { computed, ref, watch } from 'vue';
import { fieldsFor, ZodFlawSchema } from '@/types/zodFlaw';
import { advancedSearchFlaws } from '@/services/FlawService';
import { useRoute } from 'vue-router';
import { useToastStore } from '@/stores/ToastStore';

useToastStore();

type Facet = {
  field: string;
  value: string;
};

const emit = defineEmits<{
  'issues:load': [any[]];
}>();

const route = useRoute();

let isSearching = ref(false);

const fieldsMapping: Record<string, string | string[]> = {
  classification: 'workflow_state',
  cvss_scores: ['cvss_scores__score', 'cvss_scores__vector'],
  affects: ['affects__ps_module', 'affects__ps_component', 'affects__trackers__ps_update_stream'],
  acknowledgments: 'acknowledgments__name',
  trackers: [
    'affects__trackers__errata__advisory_name',
    'affects__trackers__ps_update_stream',
    'affects__trackers__external_system_id',
  ],
  references: [],
  comments: [],
};

const excludedFields = [
  'cvss2',
  'cvss2_score',
  'cvss3',
  'cvss3_score',
  'major_incident_state',
  'meta',
  'updated_dt',
  'reported_dt',
  'unembargo_dt',
  'summary',
  'requires_summary',
  'description',
  'statement',
  'mitigation',
  'nvd_cvss2',
  'nvd_cvss3',
  'nist_cvss_validation',
];

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
  };
  let name =
    mappings[fieldName] ||
    fieldName.replace(/__[a-z]/g, (label) => `: ${label.charAt(2).toUpperCase()}`);
  name = name.replace(/_/g, ' ');
  return name.charAt(0).toUpperCase() + name.slice(1);
};

const facets = ref<Facet[]>([{ field: '', value: '' }]);
const flawFields = fieldsFor(ZodFlawSchema)
  .filter((field) => !excludedFields.includes(field))
  .flatMap((field) => fieldsMapping[field] || field)
  .sort();
const chosenFields = computed(() => facets.value.map(({ field }) => field));

watch(facets.value, (changingFacets) => {
  const newFacet = changingFacets[changingFacets.length - 1];
  if (newFacet?.field && newFacet?.value) {
    addFacet();
  }
});

const unchosenFields = (chosenField: string) =>
  flawFields.filter((field) => !chosenFields.value.includes(field) || field === chosenField);

const { type: zodFlawType, source: zodFlawSource, impact: zodFlawImpacts } = ZodFlawSchema.shape;

const extractEnum = (zodEnum: any): string[] => Object.values(zodEnum.unwrap().unwrap().enum);

const flawTypes = extractEnum(zodFlawType);
const flawSources = extractEnum(zodFlawSource);
const flawImpacts = extractEnum(zodFlawImpacts);

const optionsFor = (field: string) =>
  ({
    type: flawTypes,
    source: flawSources,
    impact: flawImpacts,
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

function addFacet() {
  facets.value.push({ field: '', value: '' });
}

function removeFacet(index: number) {
  facets.value.splice(index, 1);
  if (!facets.value.length) {
    addFacet();
  }
}

function setIsSearching(value: boolean) {
  isSearching.value = value;
}

async function submitAdvancedSearch() {
  emit('issues:load', []);
  const params = facets.value.reduce(
    (fields, { field, value }) => {
      if (field && value) {
        fields[field] = value;
      }
      return fields;
    },
    {} as Record<string, string>,
  );
  setIsSearching(true);
  const response: { results: any } = await advancedSearchFlaws(params);
  if (response) {
    emit('issues:load', response.results);
  }
  setIsSearching(false);
  // .then((response) => {
  //   props.setIssues(response.results);
  // });
}
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
      <button class="btn btn-primary me-3" @click="submitAdvancedSearch">
        <div v-if="isSearching" class="spinner-border spinner-border-sm"></div>
        Search
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
