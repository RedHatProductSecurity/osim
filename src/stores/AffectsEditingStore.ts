import { ref, computed, onUnmounted, type Ref } from 'vue';

import { clone } from 'ramda';
import { defineStore } from 'pinia';

import { useFlaw } from '@/composables/useFlaw';
import { useFlawAffectsModel } from '@/composables/useFlawAffectsModel';

import type { ZodAffectType } from '@/types/zodAffect';
import { matcherForAffect } from '@/utils/helpers';

export const useAffectsEditingStore = defineStore('EditableAffects', () => {
  const flaw = useFlaw();

  const { initialAffects } = useFlawAffectsModel();
  const affectSelections = ref<ZodAffectType[]>([]);

  const {
    areAllAffectsSelectable,
    areAllAffectsSelected,
    isAffectSelected,
    isIndeterminateSelection,
    isSelectable,
    resetSelections,
    selectedAffects,
    toggleAffectSelection,
    toggleMultipleAffectSelections,
  } = useAffectSelections(affectSelections, isBeingEdited);

  const affectValuesPriorEdit = ref<ZodAffectType[]>([]);
  const affectsBeingEdited = ref<ZodAffectType[]>([]);

  onUnmounted($reset);

  function isBeingEdited(affect: ZodAffectType) {
    const matchingAffect = affectsBeingEdited.value.find(matcherForAffect(affect)) as ZodAffectType;
    return affectsBeingEdited.value.includes(matchingAffect);
  }

  function getAffectPriorEdit(affect: ZodAffectType): ZodAffectType {
    return affectValuesPriorEdit.value.find(prior => prior.uuid && prior.uuid === affect.uuid) || affect;
  }

  function editAffect(affect: ZodAffectType) {
    if (isAffectSelected(affect)) {
      toggleAffectSelection(affect);
    }

    if (!isBeingEdited(affect)) {
      const affectToEdit = flaw.value.affects.find(matcherForAffect(affect));
      if (affectToEdit) {
        affectsBeingEdited.value.push(affectToEdit);
        const affectCopy = clone(affect) as ZodAffectType;
        affectValuesPriorEdit.value.push(affectCopy);
      }
    }
  }

  function commitChanges(affect: ZodAffectType) {
    const matchAffect = matcherForAffect(affect);
    const updateIndex = flaw.value.affects.findIndex(matchAffect);
    flaw.value.affects.splice(updateIndex, 1, affect);
    resetStagedAffectEdit(affect);
  }

  function cancelChanges(affect: ZodAffectType) {
    resetStagedAffectEdit(affect);
  }

  function revertAffectToLastSaved(affect: ZodAffectType) {
    const saved = initialAffects.value.find(a => a.uuid === affect.uuid);
    const index = flaw.value.affects.findIndex(a => a.uuid === affect.uuid);
    if (index !== -1 && saved) {
      flaw.value.affects[index] = { ...saved };
    }
    if (isAffectSelected(affect)) {
      toggleAffectSelection(affect);
    }
  }

  function resetStagedAffectEdit(affect: ZodAffectType) {
    const matchAffect = matcherForAffect(affect);
    const editingIndex = affectsBeingEdited.value.findIndex(matchAffect);
    affectsBeingEdited.value.splice(editingIndex, 1);
    affectValuesPriorEdit.value.splice(affectValuesPriorEdit.value.findIndex(matchAffect), 1);
    if (isAffectSelected(affect)) {
      toggleAffectSelection(affect);
    }
  }
  function editSelectedAffects() {
    selectedAffects.value.forEach(editAffect);
  }

  function commitAllChanges() {
    const affectsToCommit = [...affectsBeingEdited.value];
    affectsToCommit.forEach(commitChanges);
  }

  function cancelAllChanges() {
    const affectsToCancel = [...affectsBeingEdited.value];
    affectsToCancel.forEach(cancelChanges);
  }

  function $reset() {
    affectsBeingEdited.value = [];
    affectValuesPriorEdit.value = [];
  }

  return {
    cancelChanges,
    commitChanges,
    isBeingEdited,
    getAffectPriorEdit,
    editAffect,
    revertAffectToLastSaved,
    affectValuesPriorEdit,
    affectsBeingEdited,
    $reset,
    selectedAffects,
    areAllAffectsSelected,
    isIndeterminateSelection,
    isSelectable,
    areAllAffectsSelectable,
    isAffectSelected,
    toggleAffectSelection,
    toggleMultipleAffectSelections,
    resetSelections,
    editSelectedAffects,
    commitAllChanges,
    cancelAllChanges,
  };
});

function useAffectSelections(selectedAffects: Ref<ZodAffectType[]>, isBeingEdited: (affect: ZodAffectType) => boolean) {
  const flaw = useFlaw();
  const affects = computed(() => flaw.value.affects);

  const { isAffectBeingRemoved } = useFlawAffectsModel();

  function isSelectable(affect: ZodAffectType) {
    return !isAffectBeingRemoved(affect) && !isBeingEdited(affect);
  }

  function isAffectSelected(affect: ZodAffectType) {
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

  function resetSelections() {
    selectedAffects.value = [];
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
    resetSelections,
  };
}
