import { ref } from 'vue';

import { defineStore } from 'pinia';
import { unionWith } from 'ramda';

import type { ZodFlawType, ZodFlawAcknowledgmentType, ZodFlawReferenceType } from '@/types/zodFlaw';

const refsComparator = (a: ZodFlawReferenceType, b: ZodFlawReferenceType): boolean => {
  return a.url === b.url && a.description === b.description;
};

const ackComparator = (a: ZodFlawAcknowledgmentType, b: ZodFlawAcknowledgmentType): boolean => {
  return a.name === b.name && a.affiliation === b.affiliation;
};

const mergeRefs =
(a: ZodFlawReferenceType[], b: ZodFlawReferenceType[]) => unionWith(refsComparator, a, b);

// If an element exists in both lists, the first element from the first list will be used.
const mergeAcks =
(a: ZodFlawAcknowledgmentType[], b: ZodFlawAcknowledgmentType[]) => unionWith(ackComparator, a, b);

export const useDraftFlawStore = defineStore('DraftFlawStore', () => {
  const draftFlaw = ref<null | ZodFlawType>(null);

  function saveDraftFlaw(flaw: ZodFlawType) {
    draftFlaw.value = flaw;
  }

  function addDraftFields(fetchedFlaw: ZodFlawType) {
    if (draftFlaw.value?.acknowledgments) {
      fetchedFlaw.acknowledgments = mergeAcks(fetchedFlaw.acknowledgments, draftFlaw.value.acknowledgments);
    }
    if (draftFlaw.value?.references) {
      fetchedFlaw.references = mergeRefs(fetchedFlaw.references, draftFlaw.value.references);
    }

    return fetchedFlaw;
  }

  function $reset() {
    draftFlaw.value = null;
  }

  return {
    $reset,
    draftFlaw,
    saveDraftFlaw,
    addDraftFields,
  };
});
