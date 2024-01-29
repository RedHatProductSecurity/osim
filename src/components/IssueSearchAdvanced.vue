<script setup lang="ts">
const props=defineProps<{
  setIssues: Function
}>()
import { computed, ref } from 'vue';
import { fieldsFor, ZodFlawSchema } from '@/types/zodFlaw';
import { advancedSearchFlaws } from '@/services/FlawService';
import { set } from 'zod';

type Facet = {
  field: string;
  value: string;
}
const facets = ref<Facet[]>([{ field: '', value: '' }]);
const flawFields = fieldsFor(ZodFlawSchema);
const chosenFields = computed(() => {
  return facets.value.map(({ field }) => field);
})

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
}
function submitAdvancedSearch() {
  const params = facets.value.reduce((acc, { field, value }) => {
    if (field && value) {
      acc[field] = value;
    }
    return acc;
  }, {} as Record<string, string>);
  advancedSearchFlaws(params)
    .then(response => {
      console.log('IssueSearch: got advanced flaws: ', response);
      // issues.value = response.results;
      props.setIssues(response.results);
    })
    .catch(err => {
      console.error('IssueSearch: getFlaws error: ', err);
    })
}
const shouldShowAdvanced = ref(false);
</script>

<template>
  
  <button v-if="!shouldShowAdvanced" @click="shouldShowAdvanced=true">Advanced Search</button>
  <div v-else class="osim-advanced-filtering" >
    <label class="d-block" v-for="(facet, index) in facets">
      <select v-model="facet.field">
        <option selected v-if="!facet.field">-</option>
        <!-- <option v-for="(field) in unchosenFields(facet.field)" :value="field"> -->
        <option v-for="(field) in flawFields" :value="field">
          {{ field }}
        </option>
      </select>
      <select name="" id="" v-if="optionsFor(facet.field)" v-model="facet.value">
        <option v-for="option in optionsFor(facet.field)" :value="option">
          {{ option }}
        </option>
      </select>
      <input type="text" name="" id="" v-model="facet.value" v-else>
      <button @click="removeFacet(index)">-</button>
    </label>
    <button @click="addFacet">+</button>
    <button @click="submitAdvancedSearch">🚀</button>

  </div>
</template>

<style scoped></style>
