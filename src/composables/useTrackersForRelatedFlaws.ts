import { computed, ref, watch, type Ref } from 'vue';

import type { ZodAffectType } from '@/types/zodAffect';
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
      })
      .catch(console.error);
  });

  async function fileTrackers() {
    const errors: unknown[] = [];
    for (const [, { fileTrackers }] of Object.entries(multiFlawTrackers.value)) {
      console.log(Object.entries(multiFlawTrackers.value));
      try {
        await fileTrackers();
      } catch (error) {
        errors.push(error);
      }
    }

    if (errors.length > 0) {
      console.error('Error(s) occurred while filing trackers:', errors);
    }

    return { success: !errors.length, errors };
  }

  function synchronizeTrackerSelections(selections: Map<any, any>) {
    for (const trackerManager of Object.values(multiFlawTrackers.value)) {
      const trackerSelections = trackerManager.trackerSelections as unknown as Map<any, any>;
      for (const updateStream of trackerSelections.keys()) {
        const selectionUpdateStream = Array.from(selections.keys())
          .find((selection: any) =>
            selection.ps_module === updateStream.ps_module
            && selection.ps_component === updateStream.ps_component
          );
        trackerSelections.set(updateStream, selections.get(selectionUpdateStream));
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
