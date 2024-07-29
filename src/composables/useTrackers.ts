import type { ValueOf, Nullable } from '@/utils/typeHelpers';
import { computed, ref, watch, type Ref } from 'vue';

import { getTrackersForFlaws, type TrackersPost, fileTrackingFor } from '@/services/TrackerService';
import { affectResolutions, type ZodAffectType, type ZodTrackerType } from '@/types/zodAffect';

export type UpdateStream = ModuleComponentProductStream & UpdateStreamMeta;
type ZodTrackerTypeWithAffect = ZodTrackerType & ZodAffectType;

type ModuleComponent = {
  ps_module: string;
  ps_component: string;
  streams: ModuleComponentProductStream[];
  selected: boolean;
  affect: ZodAffectType;
}

type ModuleComponentProductStream = {
  ps_update_stream: string;
  selected: boolean;
  acked: boolean;
  eus: boolean;
  aus: boolean;
};

type UpdateStreamMeta = {
  affectUuid?: string | null;
  ps_component?: string;
  ps_module?: string;
};

export function useTrackers(flawUuid: string, affects: Ref<ZodAffectType[]>) {

  const trackerSelections = ref<Map<UpdateStream, boolean>>(new Map());
  const moduleComponents = ref<ModuleComponent[]>([]);
  const isFilingTrackers = ref(false);
  const isLoadingTrackers = ref(false);

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

  type AllowedResolution = ValueOf<typeof affectResolutions>;
  type AllowedResolutionGuard = ZodAffectType & typeof allowedResolutions[number];

  const allowedResolutions: Nullable<AllowedResolution>[] = [
    affectResolutions.Delegated,
    affectResolutions.Empty,
  ];

  function isResolutionTrackable(affect: ZodAffectType): affect is AllowedResolutionGuard {
    return allowedResolutions.includes(affect.resolution);
  }

  const availableUpdateStreams = computed((): UpdateStream[] => moduleComponents.value
    .filter(moduleComponent => isResolutionTrackable(moduleComponent.affect))
    .flatMap((moduleComponent) =>
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

  const filterString = ref('');

  const untrackedAffects = computed(() => affects.value.filter((affect) => affect.trackers.length === 0));

  const untrackableAffects = computed(() => untrackedAffects.value
    .filter((affect) =>
      isResolutionTrackable(affect) // Don't report affects that have invalid resolutions as untrackable
      && availableUpdateStreams.value.find(
        stream => stream.ps_module === affect.ps_module && stream.ps_component === affect.ps_component
      ) === undefined
    )
  );

  watch(moduleComponents, () => {
    moduleComponents.value.forEach((moduleComponent) => {
      const affect = affects.value.find((matchingAffect) => matchingAffect.uuid === moduleComponent.affect.uuid);
      const trackers = availableUpdateStreams.value.filter((stream) => affect && stream.affectUuid === affect.uuid);
      for (const tracker of trackers) {
        trackerSelections.value.set(tracker as UpdateStream, Boolean(tracker.selected));
      }
    });
  });

  loadTrackers();

  function setAllTrackerSelections(isSelected: boolean) {
    for (const stream of sortedStreams.value) {
      trackerSelections.value.set(stream, isSelected);
    }
  }

  function toggleTrackerSelections(affectStreams: UpdateStream[]) {
    for (const stream of affectStreams) {
      trackerSelections.value.set(stream, !trackerSelections.value.get(stream));
    }
  }

  const trackersToFile = computed((): TrackersPost[] =>
    Array.from(trackerSelections.value)
      .filter(([, selected]) => selected)
      .map(([tracker]) => {
        const affect = affects.value.find((matchingAffect) => matchingAffect.uuid === tracker.affectUuid);
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
    isLoadingTrackers.value = true;
    return getTrackersForFlaws({ flaw_uuids: [flawUuid] })
      .then((response: any) => {
        moduleComponents.value = response.modules_components;
      })
      .catch(e => console.error('useTrackers::loadTrackers() Error loading trackers', e))
      .finally(() => isLoadingTrackers.value = false);
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
    toggleTrackerSelections,
    sortedStreams,
    unselectedStreams,
    selectedStreams,
    filterString,
    isFilingTrackers,
    isLoadingTrackers,
  };
}
