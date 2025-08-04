import { computed, ref, toValue, type MaybeRef } from 'vue';

import { useFlaw } from '@/composables/useFlaw';

import { createLabel, deleteLabel, fetchLabels, updateLabel } from '@/services/LabelsService';
import { FlawLabelTypeEnum, type ZodFlawLabelType } from '@/types/zodFlaw';

const labels = ref<Record<string, ZodFlawLabelType>>({});
const newLabels = ref<Set<string>>(new Set<string>());
const updatedLabels = ref<Set<string>>(new Set<string>());
const deletedLabels = ref<Set<string>>(new Set<string>());

export function useFlawLabels(initialLabels?: MaybeRef<ZodFlawLabelType[]>) {
  if (initialLabels && toValue(initialLabels)?.length) {
    labels.value = toValue(initialLabels).reduce((acc: Record<string, ZodFlawLabelType>, label) => {
      acc[label.label] = label;
      return acc;
    }, {});
    newLabels.value = new Set();
    updatedLabels.value = new Set();
    deletedLabels.value = new Set();
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

    await Promise.allSettled(requests);
  };

  return {
    labels,
    newLabels,
    updatedLabels,
    deletedLabels,
    areLabelsUpdated,
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
