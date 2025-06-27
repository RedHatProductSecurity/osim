import { ref } from 'vue';

import { useFlaw } from '@/composables/useFlaw';
import { resetInitialAffects } from '@/composables/useFlawAffectsModel';

import { getFlaw, getRelatedFlaws } from '@/services/FlawService';
import type { ZodAffectType } from '@/types';
import { useToastStore } from '@/stores/ToastStore';
import { getDisplayedOsidbError } from '@/services/osidb-errors-helpers';
import { getAffects } from '@/services/AffectService';

const isFetchingRelatedFlaws = ref(false);
const isFetchingAffects = ref(false);

export function useFetchFlaw() {
  const { flaw, relatedFlaws, resetFlaw } = useFlaw();
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

  async function fetchFlawAffects(flawCveOrId: string) {
    try {
      isFetchingAffects.value = true;
      const affectsResponse = await getAffects(flawCveOrId);
      flaw.value.affects = affectsResponse.data.results;
    } catch (error) {
      console.error('useFetchRelatedFlaws::fetchRelatedFlaws()', error);
      throw error;
    } finally {
      isFetchingAffects.value = false;
    }
  }

  async function fetchFlaw(flawCveOrId: string) {
    try {
      didFetchFail.value = false;
      const fetchedFlaw = await getFlaw(flawCveOrId);
      resetInitialAffects();
      flaw.value = Object.assign({ affects: [] }, fetchedFlaw);
      history.replaceState(null, '', `/flaws/${(fetchedFlaw.cve_id || fetchedFlaw.uuid)}`);
      await fetchFlawAffects(flawCveOrId);
      await fetchRelatedFlaws(flaw.value.affects);
    } catch (error) {
      console.error('useFetchFlaw::fetchFlaw()', error);
      didFetchFail.value = true;
      resetFlaw();
      resetInitialAffects();
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
    isFetchingAffects,
    fetchRelatedFlaws,
    flaw,
    fetchFlaw,
    didFetchFail,

  };
}
