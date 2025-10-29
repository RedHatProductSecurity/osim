import { ref } from 'vue';

import { useFlaw } from '@/composables/useFlaw';
import { resetInitialAffects } from '@/composables/useFlawAffectsModel';
import { useAegisMetadataTracking } from '@/composables/aegis/useAegisMetadataTracking';

import { getFlaw, getRelatedFlaws } from '@/services/FlawService';
import type { ZodAffectType } from '@/types';
import { useToastStore } from '@/stores/ToastStore';
import { useTourStore } from '@/stores/TourStore';
import { getDisplayedOsidbError } from '@/services/osidb-errors-helpers';
import { getAffects } from '@/services/AffectService';

const isFetchingRelatedFlaws = ref(false);
const isFetchingAffects = ref(false);

export function useFetchFlaw() {
  const { flaw, relatedFlaws, resetFlaw, setFlaw } = useFlaw();
  const { addToast } = useToastStore();
  const { setAegisMetadata } = useAegisMetadataTracking();

  const didFetchFail = ref<boolean>(false);

  async function fetchRelatedFlaws(affects: ZodAffectType[]) {
    isFetchingRelatedFlaws.value = true;
    try {
      return getRelatedFlaws(affects);
    } catch (error) {
      console.error(`Error while fetching related flaws for ${affects.length} affects:`, error);
      didFetchFail.value = true;
      throw error;
    } finally {
      isFetchingRelatedFlaws.value = false;
    }
  }

  async function fetchFlawAffects(flawCveOrId: string) {
    try {
      isFetchingAffects.value = true;
      return await getAffects(flawCveOrId);
    } catch (error) {
      console.error(`Error while fetching affects for flaw ${flawCveOrId}:`, error);
      throw error;
    }
  }

  async function fetchFlaw(flawCveOrId: string) {
    // Skip API calls during tours - tour data is pre-loaded
    const tourStore = useTourStore();
    if (tourStore.isTourActive) {
      console.log('[Tour Mode] Skipping fetchFlaw API call');
      return;
    }

    try {
      didFetchFail.value = false;
      const fetchedFlaw = getFlaw(flawCveOrId);
      const fetchedAffects = fetchFlawAffects(flawCveOrId);
      resetInitialAffects();

      const flawResult = await fetchedFlaw;
      setFlaw(Object.assign({ affects: [] }, flawResult));
      history.replaceState(null, '', `/flaws/${(flawResult.cve_id || flawResult.uuid)}`);

      // Initialize aegis metadata tracking with existing data
      setAegisMetadata(flawResult.aegis_meta);

      const affectResults = (await fetchedAffects).data.results;
      flaw.value.affects = affectResults;
      isFetchingAffects.value = false;
      setFlaw(flaw.value);

      const fetchedRelatedFlaws = fetchRelatedFlaws(affectResults);
      relatedFlaws.value = await fetchedRelatedFlaws;
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
