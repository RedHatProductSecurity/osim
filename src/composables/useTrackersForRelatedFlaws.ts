import { computed, ref, watch, type Ref } from 'vue';

import type { ZodAffectType, ZodTrackerType } from '@/types/zodAffect';
import type { ZodFlawType } from '@/types/zodFlaw';
import type { ModuleComponent } from '@/composables/useTrackersForSingleFlaw';

import { useTrackersForSingleFlaw } from '@/composables/useTrackersForSingleFlaw';
import { getTrackersForFlaws } from '@/services/TrackerService';


type MultiFlawTrackers = Record<string, ReturnType<typeof useTrackersForSingleFlaw>>;

// export async function useRelatedFlaws(affects: Ref<ZodAffectType[]>) {
//   const relatedFlaws = await getRelatedFlaws(affects.value);
//   const flawUuids = relatedFlaws.map((flaw) => flaw.uuid);
// }

function useState() {

  const multiFlawTrackers = ref<MultiFlawTrackers>({});
  const filterString = ref('');
  const relatedFlawModuleComponents = ref<ModuleComponent[]>([]);

  return {
    multiFlawTrackers,
    filterString,
    relatedFlawModuleComponents,
  };
}

function useComputedState(multiFlawTrackers: Ref<MultiFlawTrackers>, relatedFlaws: Ref<ZodFlawType[]>) {

  const flawUuids = computed(() => relatedFlaws.value.map((flaw) => flaw.uuid));

  const relatedAffects = computed(() => relatedFlaws.value.reduce(
    (affectsBook: Record<string, ZodAffectType[]>, flaw) => {
      affectsBook[flaw.cve_id ?? flaw.uuid] = flaw.affects;
      return affectsBook;
    }, {}));

  const isFilingTrackers = computed(
    () => Object.entries(multiFlawTrackers.value).some(([, { isFilingTrackers }]) => isFilingTrackers)
  );

  const trackersToFile = computed(
    () => Object.entries(multiFlawTrackers.value).flatMap(([, { trackersToFile }]) => trackersToFile)
  );

  return {
    flawUuids,
    relatedAffects,
    isFilingTrackers,
    trackersToFile,
  };
}

export function useTrackersForRelatedFlaws(primaryAffects: Ref<ZodAffectType[]>, relatedFlaws: Ref<ZodFlawType[]>) {

  const {
    multiFlawTrackers,
    filterString,
    relatedFlawModuleComponents,
  } = useState();

  const {
    isFilingTrackers,
    trackersToFile,
    relatedAffects,
    flawUuids,
  } = useComputedState(multiFlawTrackers, relatedFlaws);

  // watch(primaryAffects, async () => {
  //   if (primaryAffects.value.length === 0) {
  //     return;
  //   }

  //   const fetchedRelatedFlaws = await getRelatedFlaws(affects.value);
  //   relatedFlaws.value = fetchedRelatedFlaws;//.filter((flaw: ZodFlawType) => flaw.uuid !== flawUuid);ff
  // }, { immediate: true });


  watch(relatedAffects, (newRelatedAffects: Record<string, ZodAffectType[]>) => {
    Object.keys(newRelatedAffects).forEach((flawCveOrId) => {
      multiFlawTrackers.value[flawCveOrId] = useTrackersForSingleFlaw(ref(newRelatedAffects[flawCveOrId]));
    });
    console.log('👀 Related Affects Watcher', multiFlawTrackers.value, newRelatedAffects);
  });

  watch(filterString, (newFilterString) => {
    for (const tracker of Object.values(multiFlawTrackers.value)) {
      tracker.filterString.value = newFilterString;
    }
  });

  watch(relatedAffects, (newRelatedAffects: Record<string, ZodAffectType[]>) => {
    getTrackersForFlaws({ flaw_uuids: flawUuids.value })
      .then((response: any) => {
        relatedFlawModuleComponents.value = response.modules_components;
        Object.keys(newRelatedAffects).forEach((flawCveOrId) => {
          const newFlawAffects = ref(newRelatedAffects[flawCveOrId]);
          multiFlawTrackers.value[flawCveOrId] = useTrackersForSingleFlaw(newFlawAffects, relatedFlawModuleComponents);
        });
        console.log('👀 Related Affects Watcher', multiFlawTrackers.value, newRelatedAffects, relatedFlawModuleComponents.value);
      })
      .catch(console.error);
  });

  // watch(
  //   // computed(() => Object.keys(multiFlawTrackers.value)),
  //   computed(() => Object.values(multiFlawTrackers.value)),
  //   (newMultiFlawTrackers) => {
  //     selectionWatchers.forEach((unwatch) => unwatch());
  //     console.log('👀 Multi-Flaw Selections Watcher', Object.values(newMultiFlawTrackers));


  //     // if (!shouldApplySelectionsToEachRelatedFlaw.value) {
  //     //   return;
  //     // }

  //     selectionWatchers = Object.values(newMultiFlawTrackers).map((newTracker) =>
  //       watch(newTracker.trackerSelections, (newSelections) => {

  //         console.log('👀👀👀👀 Multi-Flaw Individual Selection watcher', newSelections);
  //         synchronizeTrackerSelections(newSelections);
  //       }, { deep: true }));
  //     // );
  //   }, { immediate: true, deep: false }
  // );

  async function fileTrackers() {
    try {
      for (const [, { fileTrackers }] of Object.entries(multiFlawTrackers.value)) {
        console.log(fileTrackers, multiFlawTrackers.value);
        await fileTrackers();
      }
      return { success: true };
    } catch (error) {
      console.error('Error occurred while filing trackers:', error);
      return error;
    }
  }

  function synchronizeTrackerSelections(selections: Map<any, any>) {
    for (const trackerManager of Object.values(multiFlawTrackers.value)) {
      // console.log(trackerManager.trackerSelections);
      for (const [updateStream, isSelected] of (trackerManager.trackerSelections).entries()) {
        // console.log(updateStream, isSelected, selections);
        const selectionUpdateStream = Array.from(selections.keys())
          .find((selection: any) => 
            selection.ps_module === updateStream.ps_module
            && selection.ps_component === updateStream.ps_component
        );
        // console.log(trackerManager.trackerSelections.get(updateStream));
        // console.log(selectionUpdateStream,
        //   selections.get(selectionUpdateStream)
        // );
        trackerManager.trackerSelections.set(updateStream, selections.get(selectionUpdateStream));
        // console.log(trackerManager.trackerSelections.get(updateStream));
      }
    }
  }

  return {
    fileTrackers,
    synchronizeTrackerSelections,
    filterString,
    isFilingTrackers,
    trackersToFile,
    relatedAffects,
    multiFlawTrackers,
  };
}
