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
      acc[label.name] = label;
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

  const isNewLabel = (label: ZodFlawLabelType) => newLabels.value.has(label.name);
  const isUpdatedLabel = (label: ZodFlawLabelType) => updatedLabels.value.has(label.name);
  const isDeletedLabel = (label: ZodFlawLabelType) => deletedLabels.value.has(label.name);

  const updateLabels = async () => {
    if (!flaw.value) {
      return { hasErrors: false };
    }

    const operations: { onSuccess: () => void; request: Promise<unknown> }[] = [];
    for (const newLabel of newLabels.value) {
      operations.push({
        request: createLabel(flaw.value.uuid, labels.value[newLabel]),
        onSuccess: () => newLabels.value.delete(newLabel),
      });
    }

    for (const updatedLabel of updatedLabels.value) {
      operations.push({
        request: updateLabel(flaw.value.uuid, labels.value[updatedLabel]),
        onSuccess: () => updatedLabels.value.delete(updatedLabel),
      });
    }

    for (const deletedLabel of deletedLabels.value) {
      operations.push({
        request: deleteLabel(flaw.value.uuid, labels.value[deletedLabel]),
        onSuccess: () => {
          deletedLabels.value.delete(deletedLabel);
          delete labels.value[deletedLabel];
        },
      });
    }

    const settled = await Promise.allSettled(operations.map(({ request }) => request));

    let hasErrors = false;
    settled.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        operations[index].onSuccess();
      } else {
        hasErrors = true;
      }
    });

    return { hasErrors };
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
