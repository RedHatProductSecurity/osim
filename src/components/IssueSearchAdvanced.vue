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

const route = useRoute();

type Facet = {
  field: string;
  value: string;
};
const facets = ref<Facet[]>([{ field: '', value: '' }]);
const flawFields = fieldsFor(ZodFlawSchema);
const chosenFields = computed(() => facets.value.map(({ field }) => field));

watch(facets.value, (changingFacets) => {
  const newFacet = changingFacets[changingFacets.length - 1];
  if (newFacet?.field && newFacet?.value) {
    addFacet();
  }
});

const unchosenFields = (chosenField: string) =>
  flawFields.filter(
    (field) => !chosenFields.value.includes(field) || field === chosenField
  );

const {
  type: zodFlawType,
  source: zodFlawSource,
  impact: zodFlawImpacts,
} = ZodFlawSchema.shape;

const extractEnum = (zodEnum: any): string[] =>
  Object.values(zodEnum.unwrap().unwrap().enum);

const flawTypes = extractEnum(zodFlawType);
const flawSources = extractEnum(zodFlawSource);
const flawImpacts = extractEnum(zodFlawImpacts);

const optionsFor = (field: string) =>
  ({
    type: flawTypes,
    source: flawSources,
    impact: flawImpacts,
  }[field] || null);

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
    .then((response) => {
      props.setIssues(response.results);
    })
    .catch((err) => {
      console.error('IssueSearch: getFlaws error: ', err);
    });
}
const shouldShowAdvanced = ref(route.query.mode === 'advanced');
</script>

<template>
  <details :open="shouldShowAdvanced" class="osim-advanced-search-container">
    <summary class="mb-2" @click="shouldShowAdvanced = true">
      Advanced Search
    </summary>
    <form class="mb-2" @submit.prevent="submitAdvancedSearch">
      <div v-for="(facet, index) in facets" :key="facet.field" class="input-group mb-2">
        <select v-model="facet.field" class="form-select search-facet-field" @submit.prevent>
          <option
            v-if="!facet.field"
            selected
            value="" 
            disabled
          >
            Select field...
          </option>
          <option
            v-for="field in unchosenFields(facet.field)"
            :key="field"
            :value="field"
          >
            {{ field }}
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
        <button
          class="btn btn-outline-primary"
          type="button"
          @click="removeFacet(index)"
        >
          <i class="bi-x" aria-label="remove field"></i>
        </button>
      </div>
      <button class="btn btn-primary me-3" @click="submitAdvancedSearch">
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
