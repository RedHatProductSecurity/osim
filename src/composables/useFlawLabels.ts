import { computed, getCurrentScope, ref, toValue, watch, type MaybeRef } from 'vue';

import { useFlaw } from '@/composables/useFlaw';

import { createLabel, deleteLabel, fetchLabels, updateLabel } from '@/services/LabelsService';
import { FlawLabelTypeEnum, type ZodFlawLabelType } from '@/types/zodFlaw';

const labels = ref<Record<string, ZodFlawLabelType>>({});
const newLabels = ref<Set<string>>(new Set<string>());
const updatedLabels = ref<Set<string>>(new Set<string>());
const deletedLabels = ref<Set<string>>(new Set<string>());

function initLabels(labelArray: null | undefined | ZodFlawLabelType[]) {
  labels.value = Array.isArray(labelArray)
    ? labelArray.reduce((acc: Record<string, ZodFlawLabelType>, label) => {
      acc[label.label] = label;
      return acc;
    }, {})
    : {};
  newLabels.value = new Set();
  updatedLabels.value = new Set();
  deletedLabels.value = new Set();
}

export function useFlawLabels(initialLabels?: MaybeRef<ZodFlawLabelType[]>) {
  if (initialLabels !== undefined) {
    initLabels(toValue(initialLabels));
    // Re-initialize when the prop changes (e.g. after a flaw refetch discards pending edits).
    // Only set up the watcher inside an active scope; Vue auto-disposes it on unmount.
    if (getCurrentScope()) watch(() => toValue(initialLabels), initLabels);
  }

  const { flaw } = useFlaw();
  const areLabelsUpdated = computed(() =>
    newLabels.value.size > 0 || updatedLabels.value.size > 0 || deletedLabels.value.size > 0,
  );

  const isNewLabel = (label: ZodFlawLabelType) => newLabels.value.has(label.label);
  const isUpdatedLabel = (label: ZodFlawLabelType) => updatedLabels.value.has(label.label);
  const isDeletedLabel = (label: ZodFlawLabelType) => deletedLabels.value.has(label.label);

  const updateLabels = async () => {
    if (!flaw.value) {
      return;
    }

    const requests = [];
    for (const newLabel of newLabels.value) {
      requests.push(createLabel(flaw.value.uuid, labels.value[newLabel]));
    }

    for (const updatedLabel of updatedLabels.value) {
      requests.push(updateLabel(flaw.value.uuid, labels.value[updatedLabel]));
    }

    for (const deletedLabel of deletedLabels.value) {
      requests.push(deleteLabel(flaw.value.uuid, labels.value[deletedLabel]));
    }

    return await Promise.allSettled(requests);
  };

  return {
    labels,
    newLabels,
    updatedLabels,
    deletedLabels,
    areLabelsUpdated,
    loadBuLabels,
    loadContextLabels,
    isNewLabel,
    isUpdatedLabel,
    isDeletedLabel,
    updateLabels,
  };
}

async function loadContextLabels(): Promise<string[]> {
  const storageKey = 'osim-context-labels';
  const storedLabels = sessionStorage.getItem(storageKey);
  if (storedLabels) {
    return JSON.parse(storedLabels);
  }

  const labels = (await fetchLabels())
    .filter(({ type }) => type === FlawLabelTypeEnum.CONTEXT_BASED)
    .map(({ name }) => name);

  sessionStorage.setItem(storageKey, JSON.stringify(labels));

  return labels;
}

async function loadBuLabels(): Promise<string[]> {
  const storageKey = 'osim-bu-labels';
  const storedLabels = sessionStorage.getItem(storageKey);
  if (storedLabels) {
    return JSON.parse(storedLabels);
  }

  const labels = (await fetchLabels())
    .filter(({ type }) => type === FlawLabelTypeEnum.BU)
    .map(({ name }) => name);

  sessionStorage.setItem(storageKey, JSON.stringify(labels));

  return labels;
}
