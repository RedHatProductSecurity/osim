import { ref } from 'vue';
import { defineStore } from 'pinia';
import type { ZodFlawType } from '@/types/zodFlaw';
import { unionWith } from 'ramda';
import type { ZodFlawAcknowledgmentType, ZodFlawReferenceType } from '@/types/zodFlaw';

export const useDraftFlawStore = defineStore('DraftFlawStore', () => {
  const draftFlaw = ref<ZodFlawType | null>(null);

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

  const mergeRefs =
    (a: ZodFlawReferenceType[], b: ZodFlawReferenceType[]) => unionWith(refsComparator, a, b);

  const refsComparator = (a: ZodFlawReferenceType, b: ZodFlawReferenceType): boolean => {
    return a.url === b.url && a.description === b.description;
  };
  // If an element exists in both lists, the first element from the first list will be used.
  const mergeAcks =
    (a: ZodFlawAcknowledgmentType[], b: ZodFlawAcknowledgmentType[]) => unionWith(ackComparator, a, b);

  const ackComparator = (a: ZodFlawAcknowledgmentType, b: ZodFlawAcknowledgmentType): boolean => {
    return a.name === b.name && a.affiliation === b.affiliation;
  };

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

