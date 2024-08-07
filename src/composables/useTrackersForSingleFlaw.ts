import { computed, ref, watch, type Ref } from 'vue';

import { getTrackersForFlaws, type TrackersPost, fileTrackingFor } from '@/services/TrackerService';
import type { ZodAffectType, ZodTrackerType } from '@/types/zodAffect';
// import { getRelatedFlaws } from '@/services/FlawService';
import type { ZodFlawType } from '@/types/zodFlaw';

export type UpdateStream = ModuleComponentStream & ModuleComponentStreamMeta;
type ZodTrackerTypeWithAffect = ZodTrackerType & ZodAffectType;

export type ModuleComponent = {
  ps_module: string;
  ps_component: string;
  streams: ModuleComponentStream[];
  selected: boolean;
  affect: ZodAffectType;
}

type ModuleComponentStream = {
  ps_update_stream: string;
  selected: boolean;
  acked: boolean;
  eus: boolean;
  aus: boolean;
};

type ModuleComponentStreamMeta = {
  affectUuid?: string | null;
  ps_component?: string;
  ps_module?: string;
};

export function useTrackersForSingleFlaw(
  affects: Ref<ZodAffectType[]>,
  relatedModuleComponents?: Ref<ModuleComponent[]>
) {

  const trackerSelections = ref<Map<UpdateStream, boolean>>(new Map());
  const isFilingTrackers = ref(false);
  const filterString = ref('');
  const moduleComponents = ref<ModuleComponent[]>([]);
  const flawUuid = computed(() => affects.value.map((affect) => affect.uuid).find(Boolean));

  const availableUpdateStreams = computed((): UpdateStream[] => moduleComponents.value.flatMap((moduleComponent) =>
    moduleComponent.streams.map((stream: UpdateStream) => ({
      ...stream,
      ps_component: moduleComponent.ps_component,
      ps_module: moduleComponent.ps_module,
      affectUuid: moduleComponent.affect.uuid
    }))
  ).filter((stream: UpdateStream) => !alreadyFiledTrackers.value.find(
    (tracker: ZodTrackerTypeWithAffect) => tracker.ps_update_stream === stream.ps_update_stream
        && tracker.ps_component === stream.ps_component
  )));

  const trackedAffectUuids = computed(() => affects.value.flatMap(
    (affect) => affect.trackers.flatMap(tracker => tracker.affects)
  ));

  const alreadyFiledTrackers = computed(() => affects.value.flatMap(
    (affect) => {

      const filedAffectTrackers = affect.trackers.filter(
        tracker => tracker.affects?.some(
          (affectUuid: string) => trackedAffectUuids.value.includes(affectUuid))
      );

      return filedAffectTrackers.map(filedTracker => ({
        ...filedTracker,
        ...affect,
      }));
    })
  );

  const sortedStreams = computed(
    (): UpdateStream[] => availableUpdateStreams.value
      .slice()
      .sort((a, b) => a.ps_update_stream.localeCompare(b.ps_update_stream))
      .filter((tracker) =>
        filterString.value === ''
          ? tracker
          : tracker.ps_update_stream.toLowerCase().includes(filterString.value.toLowerCase())
            || tracker.ps_component?.toLowerCase().includes(filterString.value.toLowerCase())
      )
  );

  const unselectedStreams = computed(
    (): UpdateStream[] => sortedStreams.value.filter((tracker) => !trackerSelections.value.get(tracker))
  );

  const selectedStreams = computed(
    (): UpdateStream[] => sortedStreams.value.filter((tracker) => trackerSelections.value.get(tracker))
  );

  const untrackedAffects = computed(() => affects.value.filter((affect) => affect.trackers.length === 0));

  const untrackableAffects = computed(() => untrackedAffects.value
    .filter(
      (affect) => availableUpdateStreams.value.find(
        stream => stream.ps_module === affect.ps_module && stream.ps_component === affect.ps_component
      ) === undefined
    )
  );

  if (moduleComponents.value) {
    watch(moduleComponents, () => {
      moduleComponents.value.forEach((moduleComponent) => {
        const affect = affects.value.find((matchingAffect) =>
          matchingAffect.ps_component === moduleComponent.affect.ps_component
          && matchingAffect.ps_module === moduleComponent.affect.ps_module
        );
        const trackers = availableUpdateStreams.value.filter((stream) =>
          affect && stream.ps_component === affect.ps_component && stream.ps_module === affect.ps_module
        );
        for (const tracker of trackers) {
          trackerSelections.value.set(tracker as UpdateStream, Boolean(tracker.selected));
        }
      });
    });
  }

  loadTrackers(); // TODO: is this needed still?

  function setAllTrackerSelections(isSelected: boolean) {
    for (const stream of sortedStreams.value) {
      trackerSelections.value.set(stream, isSelected);
    }
  }

  const trackersToFile = computed((): TrackersPost[] =>
    Array.from(trackerSelections.value)
      .filter(([, selected]) => selected)
      .map(([tracker]) => {
        const affect = affects.value.find((matchingAffect) =>
          matchingAffect.ps_component === tracker.ps_component && matchingAffect.ps_module === tracker.ps_module);
        return {
          affects: [tracker.affectUuid],
          ps_update_stream: tracker.ps_update_stream,
          resolution: affect?.resolution,
          embargoed: affect?.embargoed,
          updated_dt: affect?.updated_dt,
        } as TrackersPost;
      })
  );

  function loadTrackers() {
    if (relatedModuleComponents) {
      moduleComponents.value = relatedModuleComponents.value;
      return;
    }

    if (!flawUuid.value) {
      return;
    }

    return getTrackersForFlaws({ flaw_uuids:[ flawUuid.value ] })
      .then((response: any) => {
        moduleComponents.value = response.modules_components;
      })
      .catch(console.error);
  }

  function getUpdateStreamsFor(module: string, component: string) {
    const moduleComponent = moduleComponents.value.find(
      ({ ps_module, ps_component }: ModuleComponent) => ps_module === module && ps_component === component
    );
    return moduleComponent ? moduleComponent.streams : [];
  }

  function fileTrackers() {
    isFilingTrackers.value = true;
    return fileTrackingFor(trackersToFile.value)
      .then(loadTrackers)
      .finally(() => isFilingTrackers.value = false);
  }

  return {
    fileTrackers,
    getUpdateStreamsFor,
    alreadyFiledTrackers,
    availableUpdateStreams,
    untrackableAffects,
    trackerSelections,
    trackersToFile,
    setAllTrackerSelections,
    sortedStreams,
    unselectedStreams,
    selectedStreams,
    filterString,
    isFilingTrackers,
    // relatedAffects,
  };
}
