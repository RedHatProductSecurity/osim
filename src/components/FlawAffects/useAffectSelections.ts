import { type Ref, ref, computed } from 'vue';

import type { ZodAffectType } from '@/types/zodAffect';

const selectedAffects = ref<ZodAffectType[]>([]);

export function useAffectSelections(
  affects: Ref<ZodAffectType[]>,
  isSelectable: (affect: ZodAffectType) => boolean,
) {
  function isAffectSelected(affect: any) {
    return isSelectable(affect) && selectedAffects.value.includes(affect);
  }

  const areAllAffectsSelected = computed(() => {
    return affects.value.every(isAffectSelected);
  });

  const isIndeterminateSelection = computed(() => {
    return !areAllAffectsSelected.value && affects.value.some(isAffectSelected);
  });

  const areAllAffectsSelectable = computed(() => affects.value.every(isSelectable));

  function toggleAffectSelection(affect: ZodAffectType) {
    if (!isSelectable(affect)) {
      return;
    }
    if (!isAffectSelected(affect)) {
      selectedAffects.value.push(affect);
    } else {
      selectedAffects.value = selectedAffects.value.filter(a => a !== affect);
    }
  }

  function toggleMultipleAffectSelections(event: Event) {
    if (areAllAffectsSelected.value) {
      affects.value.forEach(affect => toggleAffectSelection(affect));
    } else if (selectedAffects.value.length === 0) {
      affects.value.filter(affect => !isAffectSelected(affect)).forEach(affect => toggleAffectSelection(affect));
    } else {
      // De-select all selected affects if only some are selected
      affects.value.filter(affect => isAffectSelected(affect)).forEach(toggleAffectSelection);
      (event.target as HTMLInputElement).checked = false;
    }
  }
  return {
    selectedAffects,
    areAllAffectsSelected,
    isIndeterminateSelection,
    isSelectable,
    areAllAffectsSelectable,
    isAffectSelected,
    toggleAffectSelection,
    toggleMultipleAffectSelections,
  };
}
