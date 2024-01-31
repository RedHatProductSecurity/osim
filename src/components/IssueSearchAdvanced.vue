<script setup lang="ts">
const props = defineProps<{
  setIssues: Function
}>()
import { computed, ref, watch } from 'vue';
import { fieldsFor, ZodFlawSchema } from '@/types/zodFlaw';
import { advancedSearchFlaws } from '@/services/FlawService';
import { useRoute } from 'vue-router';

const route = useRoute();

type Facet = {
  field: string;
  value: string;
}
const facets = ref<Facet[]>([{ field: '', value: '' }]);
const flawFields = fieldsFor(ZodFlawSchema);
const chosenFields = computed(() => facets.value.map(({ field }) => field));

watch(facets.value, (changingFacets) => {
  const newFacet = changingFacets[changingFacets.length - 1];
  if (newFacet?.field && newFacet?.value) {
    addFacet();
  }
});

const unchosenFields = (chosenField: string) => flawFields.filter(field =>
  !chosenFields.value.includes(field) || field === chosenField
);

const flawTypes = Object.values(ZodFlawSchema.shape.type.unwrap().unwrap().enum) as string[];
const flawSources = Object.values(ZodFlawSchema.shape.source.unwrap().unwrap().enum) as string[];
const flawImpacts = Object.values(ZodFlawSchema.shape.impact.unwrap().unwrap().enum) as string[];
const optionsFor = (field: string) =>
  ({
    'type': flawTypes,
    'source': flawSources,
    'impact': flawImpacts,
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

function submitAdvancedSearch() {
  const params = facets.value.reduce((fields, { field, value }) => {
    if (field && value) {
      fields[field] = value;
    }
    return fields;
  }, {} as Record<string, string>);
  advancedSearchFlaws(params)
    .then(response => {
      props.setIssues(response.results);
    })
    .catch(err => {
      console.error('IssueSearch: getFlaws error: ', err);
    })
}
const shouldShowAdvanced = ref(route.query.mode === 'advanced');
</script>

<template>
  <button v-if="!shouldShowAdvanced" class="btn btn-secondary" @click="shouldShowAdvanced = true">
    Advanced Search
  </button>
  <div v-else class="mb-4 osim-advanced-search-container">
    <div class="input-group mb-2 " v-for="(facet, index) in facets">
      <select v-model="facet.field" class="form-select">
        <option v-if="!facet.field" selected value="" disabled>Select field...</option>
        <option v-for="(field) in unchosenFields(facet.field)" :value="field">
          {{ field }}
          <i class="bi-caret-down"></i>
        </option>
      </select>

      <select v-if="optionsFor(facet.field)" v-model="facet.value" class="form-select">
        <option v-for="option in optionsFor(facet.field)" :value="option">
          {{ option }}
        </option>
      </select>
      <input v-else type="text" class="form-control" v-model="facet.value">
      <button class="btn btn-outline-secondary">
        <i class="bi-x" @click="removeFacet(index)"></i>
      </button>
    </div>

    <div class="mb-2">
      <button class="btn btn-secondary me-3" @click="submitAdvancedSearch">Search</button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.osim-advanced-search-container {
  i {
    cursor: pointer;
  }

  select:nth-child(1) {
    display: flex;
    width: auto;
    flex-grow: 0;
  }

  .form-select .btn-outline-secondary,
  select,
  input {
    border: 1px solid #DEE2E6;
    border-radius: 6px;
  }
}
</style>
