<script setup lang="ts">
import { computed, ref } from 'vue';
import { equals, clone, prop, ascend, sortWith } from 'ramda';

import type { ZodAffectType } from '@/types';
import { displayModes } from './';

import { usePaginationWithSettings } from '@/composables/usePaginationWithSettings';
import FlawAffectsTableHead from './FlawAffectsTableHead.vue';

import FlawAffectsTableRow from '@/components/FlawAffects/FlawAffectsTableRow.vue';

const affects = defineModel<ZodAffectType[]>('affects', { default: [] });
const affectsEdited = defineModel<ZodAffectType[]>('affectsEdited', { default: [] });
const props = defineProps<{
  selectedAffects: ZodAffectType[];
  error: Record<string, any>[] | null;
  affectsToDelete: ZodAffectType[];
}>();

const emit = defineEmits<{
  'affect:remove': [value: ZodAffectType];
  'affect:revert': [value: ZodAffectType];
  'affect:recover': [value: ZodAffectType];
  'affect:edit': [value: ZodAffectType];
  'affect:cancel': [value: ZodAffectType];
  'affect:commit': [value: ZodAffectType];
  'affects:display-mode': [value: displayModes];
  'affects:sort': [value: sortKeys];
  // 'affects:sort-order': [value: typeof ascend];
  // 'affects:filter': [value: string[]];
  // 'affects:filter-affectedness': [value: string[]];
  // 'affects:filter-resolution': [value: string[]];
  // 'affects:filter-impact': [value: string[]];
  // 'affects:filter-modules': [value: string[]];
}>();

const selectedModules = ref<string[]>([]);

// Affect Field Specific Filters
const affectednessFilter = ref<string[]>([]);
const resolutionFilter = ref<string[]>([]);
const impactFilter = ref<string[]>([]);

// Edit Affects
const affectValuesPriorEdit = ref<ZodAffectType[]>([]);

// Sorting
type sortKeys = keyof Pick<ZodAffectType,
  'ps_module' | 'ps_component' | 'trackers' | 'affectedness' | 'resolution' | 'impact' | 'cvss_scores'
>;

const filteredAffects = computed(() => {
  if (!affects.value) return [];

  if (affects.value.length <= 0) {
    emit('affects:display-mode', displayModes.ALL);
  }
  return affects.value?.filter(affect => {
    const matchesSelectedModules =
      selectedModules.value.length === 0 || selectedModules.value.includes(affect.ps_module);
    const matchesAffectednessFilter =
      affectednessFilter.value.length === 0 || affectednessFilter.value.includes(affect.affectedness ?? '');
    const matchesResolutionFilter =
      resolutionFilter.value.length === 0 || resolutionFilter.value.includes(affect.resolution ?? '');
    const matchesImpactsFilter =
      impactFilter.value.length === 0 || impactFilter.value.includes(affect.impact ?? '');
    return matchesSelectedModules && matchesAffectednessFilter && matchesResolutionFilter && matchesImpactsFilter;
  });
});
const sortedAffects = computed(() => sortAffects(filteredAffects.value, false));

const sortKey = ref<sortKeys>('ps_module');
const sortOrder = ref(ascend);

const {
  totalPages,
  paginatedItems: paginatedAffects,
} = usePaginationWithSettings(sortedAffects, { setting: 'affectsPerPage' });

function getAffectPriorEdit(affect: ZodAffectType): ZodAffectType {
  return affectValuesPriorEdit.value.find(a => a.uuid === affect.uuid) || affect;
}

function sortAffects(affects: ZodAffectType[], standard: boolean): ZodAffectType[] {
  const customSortKey = sortKey.value;
  const order = sortOrder.value;

  const customSortFn = (affect: ZodAffectType) => {
    const affectToSort = isBeingEdited(affect) ? getAffectPriorEdit(affect) : affect;
    if (customSortKey === 'trackers') {
      return affectToSort.trackers.length;
    }
    else if (customSortKey === 'cvss_scores') {
      return affectToSort[customSortKey].length;
    }
    return affectToSort[customSortKey] || 0;
  };

  const comparator = standard
    ? [ascend<ZodAffectType>(prop('ps_module')), ascend<ZodAffectType>(prop('ps_component'))]
    : [order<ZodAffectType>(customSortFn),
      order<ZodAffectType>(customSortKey === 'ps_module' ? prop('ps_component') : prop('ps_module'))];

  return sortWith([
    ascend((affect: ZodAffectType) => !affect.uuid ? 0 : 1),
    ...comparator
  ])(affects);
}

const savedAffects = clone(affects.value) as ZodAffectType[];

const newAffects = computed(() => affects.value?.filter(affect => !affect.uuid) ?? []);
// Modified affects
const omitAffectAttribute = (obj: ZodAffectType, key: keyof ZodAffectType) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { [key]: omitted, ...rest } = obj;
  return rest;
};
const modifiedAffects = computed(() =>
  affects.value?.filter(affect => {
    const savedAffect = savedAffects.find(a => a.uuid === affect.uuid);
    return savedAffect
      && !equals(omitAffectAttribute(savedAffect, 'trackers'), omitAffectAttribute(affect, 'trackers'))
      && !affectsEdited.value.includes(affect)
      && !newAffects.value.includes(affect);
  }) ?? []
);

function isRemoved(affect: ZodAffectType) {
  return props.affectsToDelete.includes(affect);
}

function isModified(affect: ZodAffectType) {
  return modifiedAffects.value.includes(affect);
}

function isNewAffect(affect: ZodAffectType) {
  return newAffects.value.includes(affect);
}

function isBeingEdited(affect: ZodAffectType) {
  return affectsEdited.value.includes(affect);
}
</script>

<template>
  <table class="table align-middle table-striped mt-1" :class="{'mb-0': totalPages === 0}">
    <FlawAffectsTableHead
      v-model:affects="affects"
      :selectedModules="selectedModules"
      :affects-to-delete="affectsToDelete"
    />
    <tbody>
      <template v-for="(affect, affectIndex) in paginatedAffects" :key="affectIndex">
        <FlawAffectsTableRow
          v-model:affect="paginatedAffects[affectIndex]"
          :error="props.error"
          :isRemoved="isRemoved(affect)"
          :isModified="isModified(affect)"
          :isNew="isNewAffect(affect)"
          :isBeingEdited="isBeingEdited(affect)"
          :isSelected="selectedAffects.includes(affect)"
          :isLast="affectIndex === paginatedAffects.length - 1"
          @affect:edit="emit('affect:edit', affect)"
          @affect:cancel="emit('affect:cancel', affect)"
          @affect:commit="emit('affect:commit', affect)"
          @affect:recover="emit('affect:recover', affect)"
          @affect:revert="emit('affect:revert', affect)"
          @affect:remove="emit('affect:remove', affect)"
        />
      </template>
    </tbody>
  </table>
</template>

<style scoped lang="scss">
@import '@/scss/bootstrap-overrides';

table {
  border-collapse: separate;
}

</style>
