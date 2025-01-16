import { ref } from 'vue';

import { initializeFlaw, useRelatedFlaws, useFlaw } from '@/composables/useFlaw';
import { resetInitialAffects } from '@/composables/useFlawAffectsModel';

import { getFlaw, getRelatedFlaws } from '@/services/FlawService';
import type { ZodAffectType } from '@/types';
import { useToastStore } from '@/stores/ToastStore';
import { getDisplayedOsidbError } from '@/services/osidb-errors-helpers';

const relatedFlaws = useRelatedFlaws();
const flaw = useFlaw();

const isFetchingRelatedFlaws = ref(false);

export function useFetchFlaw() {
  const { addToast } = useToastStore();

  const didFetchFail = ref<boolean>(false);

  async function fetchRelatedFlaws(affects: ZodAffectType[]) {
    isFetchingRelatedFlaws.value = true;
    try {
      relatedFlaws.value = await getRelatedFlaws(affects);
    } catch (error) {
      console.error('useFetchRelatedFlaws::fetchRelatedFlaws()', error);
      didFetchFail.value = true;
      throw error;
    } finally {
      isFetchingRelatedFlaws.value = false;
    }
  }

  async function fetchFlaw(flawCveOrId: string) {
    try {
      const fetchedFlaw = await getFlaw(flawCveOrId);
      resetInitialAffects();
      flaw.value = Object.assign({}, fetchedFlaw);
      await fetchRelatedFlaws(fetchedFlaw.affects);
      history.replaceState(null, '', `/flaws/${(fetchedFlaw.cve_id || fetchedFlaw.uuid)}`);
    } catch (error) {
      console.error('useFetchFlaw::fetchFlaw()', error);
      didFetchFail.value = true;
      initializeFlaw();
      addToast({
        title: 'Error loading Flaw',
        body: getDisplayedOsidbError(error),
      });
      console.error('FlawEditView::refreshFlaw() Error loading flaw', error);
    }
  }

  return {
    relatedFlaws,
    isFetchingRelatedFlaws,
    fetchRelatedFlaws,
    flaw,
    fetchFlaw,
    didFetchFail,
  };
}
