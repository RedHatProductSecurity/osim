import { computed, ref } from 'vue';

import { useFlaw } from '@/composables/useFlaw';
import { useAegisMetadataTracking } from '@/composables/aegis/useAegisMetadataTracking';

import { getFlaw } from '@/services/FlawService';
import { getFlawAuditHistory } from '@/services/AuditService';
import { useToastStore } from '@/stores/ToastStore';
import { useTourStore } from '@/stores/TourStore';
import { osimRuntime } from '@/stores/osimRuntime';
import { getDisplayedOsidbError } from '@/services/osidb-errors-helpers';
import { getAffects } from '@/services/AffectService';
import { isCveValid, normalizeCveId } from '@/utils/helpers';

const isFetchingAffects = ref(false);
const totalAffectCount = ref(0);
const currentlyFetchedAffectCount = ref(0);
const affectsFetchError = ref(false);
const historyFetchError = ref(false);
// Shared across composable instances: a fetch started for one flaw must not
// write into the model after a newer fetchFlaw call has replaced it.
let fetchGeneration = 0;

export function useFetchFlaw() {
  const { flaw, resetFlaw, setFlaw, setLateFlawField } = useFlaw();
  const { addToast } = useToastStore();
  const { setAegisMetadata } = useAegisMetadataTracking();

  const fetchedAffectsPercentage = computed(
    () => ((currentlyFetchedAffectCount.value / totalAffectCount.value) * 100)
      .toFixed(0),
  );

  const didFetchFail = ref<boolean>(false);

  function fetchFlawAffects(flawCveOrId: string, isCurrentFetch: () => boolean) {
    isFetchingAffects.value = true;
    return getAffects(flawCveOrId, (fetchedCount, totalCount) => {
      if (!isCurrentFetch()) return;
      totalAffectCount.value = totalCount;
      currentlyFetchedAffectCount.value = fetchedCount;
    });
  }

  async function fetchFlaw(flawCveOrId: string) {
    // Skip API calls during tours - tour data is pre-loaded
    const tourStore = useTourStore();
    if (tourStore.isTourActive) {
      console.log('[Tour Mode] Skipping fetchFlaw API call');
      return;
    }

    const normalizedId = isCveValid(flawCveOrId) ? normalizeCveId(flawCveOrId) : flawCveOrId;
    const generation = ++fetchGeneration;
    const isCurrentFetch = () => generation === fetchGeneration;

    didFetchFail.value = false;
    affectsFetchError.value = false;
    historyFetchError.value = false;
    const fetchedFlaw = getFlaw(normalizedId);
    const fetchedAffects = fetchFlawAffects(normalizedId, isCurrentFetch);
    // A superseded or failed flaw fetch returns before this is awaited.
    void fetchedAffects.catch(() => {});

    try {
      const flawResult = await fetchedFlaw;
      if (!isCurrentFetch()) return;
      setFlaw(Object.assign({ affects: [], history: undefined }, flawResult));
      history.replaceState(null, '', `/flaws/${(flawResult.cve_id || flawResult.uuid)}`);

      // Initialize aegis metadata tracking with existing data
      setAegisMetadata(flawResult.aegis_meta);

      // Fetch audit history asynchronously in parallel with affects (only if feature flag is enabled)
      if (osimRuntime.value.flags?.flawHistory) {
        getFlawAuditHistory(flawResult.uuid)
          .then((auditHistory) => {
            if (!isCurrentFetch()) return;
            historyFetchError.value = false;
            setLateFlawField('history', auditHistory);
          })
          .catch((historyError) => {
            if (!isCurrentFetch()) return;
            console.error('useFetchFlaw::fetchFlaw() Error loading audit history:', historyError);
            // Don't fail the entire flaw fetch if history fails, but set error flag
            historyFetchError.value = true;
            setLateFlawField('history', []);
          });
      }
    } catch (error) {
      // A superseded fetch failing must not reset or flag the flaw now on screen.
      if (!isCurrentFetch()) return;
      console.error('useFetchFlaw::fetchFlaw()', error);
      didFetchFail.value = true;
      resetFlaw();
      addToast({
        title: 'Error loading Flaw',
        body: getDisplayedOsidbError(error),
      });
      console.error('FlawEditView::refreshFlaw() Error loading flaw', error);
      return;
    }

    try {
      const affectResults = (await fetchedAffects).data.results;
      if (!isCurrentFetch()) return;
      isFetchingAffects.value = false;
      setLateFlawField('affects', affectResults);
    } catch (affectError) {
      if (!isCurrentFetch()) return;
      console.error('useFetchFlaw::fetchFlaw() Error loading affects:', affectError);
      isFetchingAffects.value = false;
      affectsFetchError.value = true;
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
    affectsFetchError,
    historyFetchError,
  };
}
