import { computed, ref, watch } from 'vue';

import { getTrackersForFlaws, type TrackersPost, fileTrackingFor } from '@/services/TrackerService';
import type { ZodAffectType } from '@/types/zodAffect';

export type UpdateStream = ModuleComponentProductStream & UpdateStreamMeta;

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
  affectUuid?: string;
  ps_component?: string;
};

export function useTrackers(flawUuid: string, affects: ZodAffectType[]) {

  const trackerSelections = ref<Map<UpdateStream, boolean>>(new Map());
  const moduleComponents = ref<ModuleComponent[]>([]);

  const trackedAffectUuids = computed(() => affects.flatMap(
    (affect) => affect.trackers.flatMap(tracker => tracker.affects)
  ));
  const alreadyFiledTrackers = computed(() => affects.map(
    (affect) => {
      const maybeTracker = affect.trackers.find(
        tracker => tracker.affects.some((affectUuid: string) => trackedAffectUuids.value.includes(affectUuid))
      );
      return maybeTracker && {
        ...maybeTracker,
        ...affect,
      };
    }
  ).filter(Boolean));

  const availableUpdateStreams = computed((): UpdateStream[] => moduleComponents.value.flatMap(
    (moduleComponent: any) =>
      moduleComponent.streams.map((stream: Record<string, any>) => (
        {
          ...stream,
          ps_component: moduleComponent.ps_component,
          affectUuid: moduleComponent.affect.uuid
        }
      ))
  )
    .filter((stream: any) => !trackedAffectUuids.value.includes(stream.affectUuid))
  );

  const sortedStreams = computed(
    (): UpdateStream[] => availableUpdateStreams.value
      .toSorted((a, b) => a.ps_update_stream.localeCompare(b.ps_update_stream))
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

  watch(moduleComponents, () => {
    moduleComponents.value.forEach((moduleComponent) => {
      const affect = affects.find((matchingAffect) => matchingAffect.uuid === moduleComponent.affect.uuid);
      const trackers = availableUpdateStreams.value.filter((stream) => affect && stream.affectUuid === affect.uuid);
      for (const tracker of trackers) {
        trackerSelections.value.set(tracker as UpdateStream, Boolean(tracker.selected));
      }
    });
  });

  function setAll(isSelected: boolean) {
    for (const stream of sortedStreams.value) {
      trackerSelections.value.set(stream, isSelected);
    }
  }

  const trackersToFile = computed((): TrackersPost[] =>
    Array.from(trackerSelections.value)
      .filter(([, selected]) => selected)
      .map(([tracker]) => {
        const affect = affects.find((matchingAffect) => matchingAffect.uuid === tracker.affectUuid);
        return {
          affects: [tracker.affectUuid],
          ps_update_stream: tracker.ps_update_stream,
          resolution: affect?.resolution,
          embargoed: affect?.embargoed,
          updated_dt: affect?.updated_dt,
        } as TrackersPost;
      })
  );

  getTrackersForFlaws({ flaw_uuids: [flawUuid] })
    .then((response) => {
      moduleComponents.value = response.modules_components;
    })
    .catch(console.error);

  function getUpdateStreamsFor(module: string, component: string) {
    const moduleComponent = moduleComponents.value.find(
      ({ ps_module, ps_component }: any) => ps_module === module && ps_component === component
    );
    return moduleComponent ? moduleComponent.streams : [];
  }

  function fileTrackers() {
    fileTrackingFor(trackersToFile.value);
  }

  return {
    fileTrackers,
    getUpdateStreamsFor,
    alreadyFiledTrackers,
    availableUpdateStreams,
    trackerSelections,
    trackersToFile,
    setAll,
    sortedStreams,
    unselectedStreams,
    selectedStreams,
    filterString,
  };
}