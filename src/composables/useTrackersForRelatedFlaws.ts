import { computed, ref, watch, type Ref, type UnwrapNestedRefs } from 'vue';

import type { ZodAffectType } from '@/types/zodAffect';
import type { ZodFlawType } from '@/types/zodFlaw';
import type {
  ModuleComponent,
  UpdateStreamOsim,
  UpdateStreamSelections,
} from '@/composables/useTrackersForSingleFlaw';

import type { TrackersPost } from '@/services/TrackerService';

import { useTrackersForSingleFlaw } from '@/composables/useTrackersForSingleFlaw';
import { fileTrackingFor, getTrackersForFlaws } from '@/services/TrackerService';
import { getFlaw } from '@/services/FlawService';
import { createCatchHandler } from './service-helpers';

type UseTrackersReturnType = ReturnType<typeof useTrackersForSingleFlaw>;

// For use with reactive values rather than refs (calls from template tags)
type UnrefUseTrackersReturnType = UnwrapNestedRefs<UseTrackersReturnType>;

type MultiFlawTrackers = Record<string, UseTrackersReturnType> | Record<string, UnrefUseTrackersReturnType>;

function useState(flaw: ZodFlawType) {

  const multiFlawTrackers = ref<MultiFlawTrackers>({});
  const filterString = ref('');
  const relatedFlawModuleComponents = ref<ModuleComponent[]>([]);
  const shouldFileAsMultiFlaw = ref(true);
  const selectedRelatedFlaws = ref<ZodFlawType[]>([ flaw ]);

  return {
    multiFlawTrackers,
    filterString,
    relatedFlawModuleComponents,
    shouldFileAsMultiFlaw,
    selectedRelatedFlaws,
  };
}

function useComputedState(multiFlawTrackers: Ref<MultiFlawTrackers>, relatedFlaws: Ref<ZodFlawType[]>) {

  const flawUuids = computed(() => relatedFlaws.value.map((flaw) => flaw.uuid));

  const affectsBySelectedFlawId = computed(() => relatedFlaws.value.reduce(
    (affectsBook: Record<string, ZodAffectType[]>, flaw) => {
      affectsBook[flaw.cve_id ?? flaw.uuid] = flaw.affects;
      return affectsBook;
    }, {}));

  const isFilingTrackers = computed(
    () => Object.entries(multiFlawTrackers.value).some(([, { isFilingTrackers }]) => isFilingTrackers)
  );

  const isLoadingTrackers = computed(
    () => Object.entries(multiFlawTrackers.value).some(([, { isLoadingTrackers }]) => isLoadingTrackers)
  );

  const allRelatedAffects = computed((): ZodAffectType[] => relatedFlaws.value.flatMap((flaw) => flaw.affects));

  const affectsByUuid = computed((): Record<string, ZodAffectType> => allRelatedAffects.value
    .reduce((dictionary: Record<string, ZodAffectType>, affect: ZodAffectType) => {
      dictionary[affect.uuid as string] = affect;
      return dictionary;
    }, {})
  );

  const allSelectedStreams = computed(
    () => Object.values(multiFlawTrackers.value)
      .flatMap(({ selectedStreams }) => selectedStreams));

  const trackersToFile = computed(
    (): TrackersPost[] => Object.values(
      allSelectedStreams.value.reduce((trackers: Record<string, TrackersPost>, tracker) => {
        const key = `${tracker.ps_module}-${tracker.ps_component}`;
        const affect = affectsByUuid.value[tracker.affectUuid];
        if (key in trackers) {
          trackers[key].affects.push(tracker.affectUuid);
          return trackers;
        }
        trackers[key] = {
          affects: [tracker.affectUuid],
          ps_update_stream: tracker.ps_update_stream,
          // TODO: validate that affects in mutliflaw all share the same values for the following 3 fields
          resolution: affect?.resolution,
          embargoed: affect?.embargoed,
          updated_dt: affect?.updated_dt,
        } as TrackersPost;
        return trackers;
      }, {})
    )
  );

  return {
    flawUuids,
    affectsBySelectedFlawId,
    isFilingTrackers,
    trackersToFile,
    isLoadingTrackers
  };
}

export function useTrackersForRelatedFlaws(flaw: ZodFlawType, relatedFlaws: Ref<ZodFlawType[]>) {

  const {
    multiFlawTrackers,
    filterString,
    relatedFlawModuleComponents,
    shouldFileAsMultiFlaw,
    selectedRelatedFlaws,
  } = useState(flaw);

  const {
    isFilingTrackers,
    trackersToFile,
    affectsBySelectedFlawId,
    flawUuids,
  } = useComputedState(multiFlawTrackers, selectedRelatedFlaws);

  watch(filterString, (newFilterString) => {
    for (const tracker of Object.values(multiFlawTrackers.value)) {
      tracker.filterString = newFilterString;
    }
  });

  watch(affectsBySelectedFlawId, (newRelatedAffects: Record<string, ZodAffectType[]>) => {
    getTrackersForFlaws({ flaw_uuids: flawUuids.value })
      .then((response: any) => {
        relatedFlawModuleComponents.value = response.modules_components;

        Object.keys(newRelatedAffects).forEach((flawCveOrId) => {
          // Preserve existing selections
          if (!multiFlawTrackers.value[flawCveOrId]) {
            multiFlawTrackers.value[flawCveOrId] = useTrackersForSingleFlaw(
              ref(newRelatedAffects[flawCveOrId]),
              relatedFlawModuleComponents
            );
          }
        });
      })
      .catch(console.error);
  }, { immediate: true });

  async function fileTrackers() {

    if (isFilingTrackers.value) {
      console.error('useTrackersForRelatedFlaws::fileTrackers() ][ Already filing trackers, aborting request');
      return;
    }

    Object.values(multiFlawTrackers.value).forEach((tracker) => tracker.isFilingTrackers = true);
    const errors: unknown[] = [];

    if (shouldFileAsMultiFlaw.value) {
      try {
        await fileTrackingFor(trackersToFile.value);
      } catch (error) {
        errors.push(error);
      } finally {
        Object.values(multiFlawTrackers.value).forEach((tracker) => tracker.isFilingTrackers = false);
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
      console.error('useTrackersForRelatedFlaws::fileTrackers() ][ Error(s) occurred while filing trackers:', errors);
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
            && selection.ps_update_stream === updateStream.ps_update_stream
          );

        const selection = selections.get(selectionUpdateStream as UpdateStreamOsim);

        if (selectionUpdateStream !== undefined && selection !== undefined) {
          trackerManager.trackerSelections.set(updateStream, selection);
        } else {
          console.error(
            'useTrackersForRelatedFlaws::synchronizeTrackerSelections() '
            + '][ Could not find selection for update stream:', updateStream
          );
        }
      }
    }
  }

  function addRelatedFlaw (flawId: string) {
    const flaw = relatedFlaws.value.find((flaw) => flaw.uuid === flawId || flaw.cve_id === flawId);
    if (flaw === undefined) {
      getFlaw(flawId)
        .then((fetchedFlaw) => {
          selectedRelatedFlaws.value.push(fetchedFlaw);
        }).catch(
          createCatchHandler('useTrackersForRelatedFlaws::addRelatedFlaw(): Fetch for Related Flaw Unsuccessful')
        );
    } else {
      selectedRelatedFlaws.value.push(flaw);
    }
  }

  return {
    fileTrackers,
    synchronizeTrackerSelections,
    addRelatedFlaw,
    filterString,
    isFilingTrackers,
    trackersToFile,
    affectsBySelectedFlawId,
    shouldFileAsMultiFlaw,
    multiFlawTrackers,
  };
}
