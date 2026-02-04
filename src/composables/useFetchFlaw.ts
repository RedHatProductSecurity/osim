import { computed, ref } from 'vue';

import { useFlaw } from '@/composables/useFlaw';
import { useAegisMetadataTracking } from '@/composables/aegis/useAegisMetadataTracking';

import { getFlaw } from '@/services/FlawService';
import { getFlawAuditHistory } from '@/services/AuditService';
import { useToastStore } from '@/stores/ToastStore';
import { useTourStore } from '@/stores/TourStore';
import { getDisplayedOsidbError } from '@/services/osidb-errors-helpers';
import { getAffects } from '@/services/AffectService';

const isFetchingAffects = ref(false);
const totalAffectCount = ref(0);
const currentlyFetchedAffectCount = ref(0);

export function useFetchFlaw() {
  const { flaw, resetFlaw, setFlaw } = useFlaw();
  const { addToast } = useToastStore();
  const { setAegisMetadata } = useAegisMetadataTracking();

  const fetchedAffectsPercentage = computed(
    () => ((currentlyFetchedAffectCount.value / totalAffectCount.value) * 100)
      .toFixed(0),
  );

  const didFetchFail = ref<boolean>(false);

  async function fetchFlawAffects(flawCveOrId: string) {
    try {
      isFetchingAffects.value = true;
      return await getAffects(flawCveOrId, (fetchedCount, totalCount) => {
        totalAffectCount.value = totalCount;
        currentlyFetchedAffectCount.value = fetchedCount;
      });
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

      const flawResult = await fetchedFlaw;
      setFlaw(Object.assign({ affects: [], history: undefined }, flawResult));
      history.replaceState(null, '', `/flaws/${(flawResult.cve_id || flawResult.uuid)}`);

      // Initialize aegis metadata tracking with existing data
      setAegisMetadata(flawResult.aegis_meta);

      // Fetch audit history asynchronously in parallel with affects
      getFlawAuditHistory(flawResult.uuid)
        .then((auditHistory) => {
          flaw.value.history = auditHistory;
          setFlaw(flaw.value);
        })
        .catch((historyError) => {
          console.error('useFetchFlaw::fetchFlaw() Error loading audit history:', historyError);
          // Don't fail the entire flaw fetch if history fails
          flaw.value.history = [];
          setFlaw(flaw.value);
        });

      const affectResults = (await fetchedAffects).data.results;
      flaw.value.affects = affectResults;
      isFetchingAffects.value = false;
      setFlaw(flaw.value);
    } catch (error) {
      console.error('useFetchFlaw::fetchFlaw()', error);
      didFetchFail.value = true;
      resetFlaw();
      addToast({
        title: 'Error loading Flaw',
        body: getDisplayedOsidbError(error),
      });
      console.error('FlawEditView::refreshFlaw() Error loading flaw', error);
    }
  }

  return {
    isFetchingAffects,
    totalAffectCount,
    currentlyFetchedAffectCount,
    flaw,
    fetchedAffectsPercentage,
    fetchFlaw,
    didFetchFail,
  };
}
