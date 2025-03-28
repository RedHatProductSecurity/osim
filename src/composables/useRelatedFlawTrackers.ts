import { computed, ref, watch, type Ref, type UnwrapNestedRefs } from 'vue';

import type {
  ModuleComponent,
  UpdateStreamOsim,
  UpdateStreamSelections,
} from '@/composables/useSingleFlawTrackers';
import { useSingleFlawTrackers } from '@/composables/useSingleFlawTrackers';

import type { ZodAffectType } from '@/types/zodAffect';
import type { ZodFlawType } from '@/types/zodFlaw';
import type { TrackersPost } from '@/services/TrackerService';
import { fileTrackingFor, getTrackersForFlaws } from '@/services/TrackerService';
import { getFlaw } from '@/services/FlawService';
import { isAffectIn } from '@/utils/helpers';

import { createCatchHandler } from './service-helpers';

type UseTrackersReturnType = ReturnType<typeof useSingleFlawTrackers>;
type FlawCveOrId = string;

// For use with reactive values rather than refs (calls from template tags)
type UnrefUseTrackersReturnType = UnwrapNestedRefs<UseTrackersReturnType>;

type MultiFlawTrackers = Record<string, UnrefUseTrackersReturnType> | Record<string, UseTrackersReturnType>;

const isLoadingTrackers = ref(false);

function useState(flaw: ZodFlawType) {
  const multiFlawTrackers = ref<MultiFlawTrackers>({});
  const filterString = ref('');
  const relatedFlawModuleComponents = ref<ModuleComponent[]>([]);
  const shouldFileAsMultiFlaw = ref(true);
  const selectedRelatedFlaws = ref<ZodFlawType[]>([flaw]);

  return {
    multiFlawTrackers,
    filterString,
    relatedFlawModuleComponents,
    shouldFileAsMultiFlaw,
    selectedRelatedFlaws,
    isLoadingTrackers,
  };
}

function useComputedState(
  multiFlawTrackers: Ref<MultiFlawTrackers>,
  addedRelatedFlaws: Ref<ZodFlawType[]>,
  specificAffectsToTrack: ZodAffectType[],
) {
  const flawUuids = computed(() => addedRelatedFlaws.value.map(flaw => flaw.uuid));

  const shouldIncludeAffect = (affect: ZodAffectType) => affect.uuid
    && (specificAffectsToTrack.length === 0 || isAffectIn(affect, specificAffectsToTrack));

  const affectsBySelectedFlawId = computed(() => addedRelatedFlaws.value.reduce(
    (affectsBook: Record<string, ZodAffectType[]>, flaw) => {
      affectsBook[flaw.cve_id ?? flaw.uuid] = flaw.affects.filter(shouldIncludeAffect);
      return affectsBook;
    }, {}));

  const isFilingTrackers = computed(
    () => Object.entries(multiFlawTrackers.value).some(([, { isFilingTrackers }]) => isFilingTrackers),
  );

  const allRelatedAffects = computed((): ZodAffectType[] => addedRelatedFlaws.value.flatMap(
    flaw => flaw.affects.filter(shouldIncludeAffect),
  ));

  const affectsByUuid = computed((): Record<string, ZodAffectType> => allRelatedAffects.value
    .reduce((dictionary: Record<string, ZodAffectType>, affect: ZodAffectType) => {
      dictionary[affect.uuid as string] = affect;
      return dictionary;
    }, {}),
  );

  const selectedStreams = computed(
    () => Object.values(multiFlawTrackers.value)
      .flatMap(({ selectedStreams }) => selectedStreams));

  const unselectedStreams = computed(
    () => Object.values(multiFlawTrackers.value)
      .flatMap(({ unselectedStreams }) => unselectedStreams));

  const trackersToFile = computed(
    (): TrackersPost[] => Object.values(
      selectedStreams.value.reduce((streamsToFile: Record<FlawCveOrId, TrackersPost>, affectWithStream) => {
        const componentStream = `${affectWithStream.ps_component}:${affectWithStream.ps_update_stream}`;
        const selectedAffectToTrack = affectsByUuid.value[affectWithStream.affectUuid];
        if (componentStream in streamsToFile) {
          streamsToFile[componentStream].affects.push(affectWithStream.affectUuid);
          return streamsToFile;
        }
        streamsToFile[componentStream] = {
          affects: [affectWithStream.affectUuid],
          ps_update_stream: affectWithStream.ps_update_stream,
          resolution: selectedAffectToTrack?.resolution,
          embargoed: selectedAffectToTrack?.embargoed,
          updated_dt: selectedAffectToTrack?.updated_dt,
        } as TrackersPost;
        return streamsToFile;
      }, {}),
    ),
  );

  return {
    affectsBySelectedFlawId,
    flawUuids,
    isFilingTrackers,
    selectedStreams,
    trackersToFile,
    unselectedStreams,
  };
}

export function useRelatedFlawTrackers(
  flaw: ZodFlawType,
  relatedFlaws: Ref<ZodFlawType[]>,
  specificAffectsToTrack: ZodAffectType[] = [],
) {
  let trackerFetchProgress: Promise<void> | undefined;
  const {
    filterString,
    isLoadingTrackers,
    multiFlawTrackers,
    relatedFlawModuleComponents,
    selectedRelatedFlaws,
    shouldFileAsMultiFlaw,
  } = useState(flaw);

  const {
    affectsBySelectedFlawId,
    flawUuids,
    isFilingTrackers,
    selectedStreams,
    trackersToFile,
    unselectedStreams,
  } = useComputedState(multiFlawTrackers, selectedRelatedFlaws, specificAffectsToTrack);

  watch(filterString, (newFilterString) => {
    for (const tracker of Object.values(multiFlawTrackers.value)) {
      tracker.filterString = newFilterString;
    }
  });

  watch(affectsBySelectedFlawId, (newRelatedAffects: Record<string, ZodAffectType[]>) => {
    updateMultiFlawTrackers(newRelatedAffects, false);
  }, { immediate: true });

  watch(relatedFlaws, () => {
    selectedRelatedFlaws.value.forEach((selectedFlaw, index) => {
      const relatedIndex = relatedFlaws.value.findIndex(({ uuid }) => uuid === selectedFlaw.uuid);
      if (relatedIndex !== -1) {
        selectedRelatedFlaws.value[index].affects = relatedFlaws.value[relatedIndex].affects;
      }
    });
    updateMultiFlawTrackers(affectsBySelectedFlawId.value, false);
  }, { deep: true });

  function updateMultiFlawTrackers(affectsById: Record<string, ZodAffectType[]>, shouldOverwrite = false) {
    isLoadingTrackers.value = true;
    trackerFetchProgress = getTrackersForFlaws({ flaw_uuids: flawUuids.value })
      .then((response: any) => {
        relatedFlawModuleComponents.value = response.modules_components;

        Object.keys(affectsById).forEach((flawCveOrId) => {
          // Preserve existing selections
          if (!multiFlawTrackers.value[flawCveOrId] || shouldOverwrite) {
            multiFlawTrackers.value[flawCveOrId] = useSingleFlawTrackers(
              flawCveOrId,
              ref(affectsById[flawCveOrId]),
              relatedFlawModuleComponents,
            );
          }
        });
      })
      .catch(console.error)
      .finally(() => isLoadingTrackers.value = false);
    return trackerFetchProgress;
  }

  async function fileTrackers() {
    if (isFilingTrackers.value) {
      console.error('useRelatedFlawTrackers::fileTrackers() ][ Already filing trackers, aborting request');
      return;
    }

    Object.values(multiFlawTrackers.value).forEach(tracker => tracker.isFilingTrackers = true);
    const errors: unknown[] = [];

    if (shouldFileAsMultiFlaw.value) {
      try {
        await fileTrackingFor(trackersToFile.value);
        updateMultiFlawTrackers(affectsBySelectedFlawId.value, true);
      } catch (error) {
        errors.push(error);
      } finally {
        Object.values(multiFlawTrackers.value).forEach(tracker => tracker.isFilingTrackers = false);
      }
    } else {
      for (const tracker of Object.values(multiFlawTrackers.value)) {
        try {
          await tracker.fileTrackers();
        } catch (error) {
          errors.push(error);
        } finally {
          tracker.isFilingTrackers = false;
        }
      }
    }

    if (errors.length > 0) {
      console.error('useRelatedFlawTrackers::fileTrackers() ][ Error(s) occurred while filing trackers:', errors);
    }

    return { success: !errors.length, errors };
  }

  function synchronizeTrackerSelections(selections: UpdateStreamSelections) {
    for (const trackerManager of Object.values(multiFlawTrackers.value)) {
      for (const updateStream of trackerManager.trackerSelections.keys()) {
        const selectionUpdateStream = Array.from(selections.keys())
          .find((selection: UpdateStreamOsim) =>
            selection.ps_module === updateStream.ps_module
            && selection.ps_component === updateStream.ps_component
            && selection.ps_update_stream === updateStream.ps_update_stream,
          );

        const selection = selections.get(selectionUpdateStream as UpdateStreamOsim);

        if (selectionUpdateStream !== undefined && selection !== undefined) {
          trackerManager.trackerSelections.set(updateStream, selection);
        } else {
          console.error(
            'useRelatedFlawTrackers::synchronizeTrackerSelections() '
            + '][ Could not find selection for update stream:', updateStream,
          );
        }
      }
    }
  }

  function addRelatedFlaw(flawId: string) {
    const flaw = relatedFlaws.value.find(flaw => flaw.uuid === flawId || flaw.cve_id === flawId);
    if (flaw === undefined) {
      // Handles data fetching for filing of unrelated flaws
      // and flaws that are new, related, but not yet fetched
      getFlaw(flawId)
        .then((fetchedFlaw) => {
          selectedRelatedFlaws.value.push(fetchedFlaw);
        }).catch(
          createCatchHandler('useRelatedFlawTrackers::addRelatedFlaw(): Fetch for Related Flaw Unsuccessful'),
        );
    } else {
      selectedRelatedFlaws.value.push(flaw);
    }
  }

  async function refreshRelatedFlaws() {
    isLoadingTrackers.value = true;
    // After filing new trackers, there is a delay before the new trackers are available on the flaws
    // This is a temporary workaround that may not work in all situations
    // TODO: Implement a sustainable solution (OSIDB-3961)
    await new Promise(resolve => setTimeout(resolve, 2000));
    try {
      for (const flaw of selectedRelatedFlaws.value) {
        const fetchedFlaw = await getFlaw(flaw.uuid, true);
        const index = relatedFlaws.value.findIndex(({ uuid }) => uuid === flaw.uuid);
        if (index !== -1) {
          relatedFlaws.value[index].affects = fetchedFlaw.affects;
        }
      }
    } finally {
      isLoadingTrackers.value = false;
    }
  }

  return {
    fileTrackers,
    synchronizeTrackerSelections,
    addRelatedFlaw,
    refreshRelatedFlaws,
    filterString,
    isFilingTrackers,
    trackersToFile,
    affectsBySelectedFlawId,
    shouldFileAsMultiFlaw,
    multiFlawTrackers,
    isLoadingTrackers,
    selectedStreams,
    unselectedStreams,
    trackerFetchProgress,
  };
}
