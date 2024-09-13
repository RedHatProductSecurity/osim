import { computed, ref, watch, type Ref } from 'vue';

import type { ValueOf, Nullable } from '@/utils/typeHelpers';
import { getTrackersForFlaws, type TrackersPost, fileTrackingFor } from '@/services/TrackerService';
import { affectResolutions, type ZodAffectType, type ZodTrackerType } from '@/types/zodAffect';
import { matchModuleComponent } from '@/utils/helpers';

export type UpdateStreamSelections = Map<UpdateStreamOsim, boolean>;

export type UpdateStreamOsim = ModuleComponentStreamMeta & ModuleComponentStreamOsidb;

export type ModuleComponent = {
  affect: ZodAffectType;
  ps_component: string;
  ps_module: string;
  selected: boolean;
  streams: ModuleComponentStreamOsidb[];
};

type ModuleComponentStreamOsidb = {
  acked: boolean;
  aus: boolean;
  eus: boolean;
  ps_update_stream: string;
  selected: boolean;
};

type ModuleComponentStreamMeta = {
  affectUuid?: null | string;
  ps_component?: string;
  ps_module?: string;
};

type ZodTrackerTypeWithAffect = ZodAffectType & ZodTrackerType;

export function useTrackersForSingleFlaw(
  affects: Ref<ZodAffectType[]>,
  relatedModuleComponents?: Ref<ModuleComponent[]>,
) {
  const trackerSelections = ref<UpdateStreamSelections>(new Map());
  const isFilingTrackers = ref(false);
  const isLoadingTrackers = ref(false);
  const filterString = ref('');
  const moduleComponents = ref<ModuleComponent[]>([]);
  const flawUuid = computed(() => affects.value.map(affect => affect.uuid).find(Boolean));

  const availableUpdateStreams = computed((): UpdateStreamOsim[] => moduleComponents.value
    .filter(moduleComponent => isResolutionTrackable(moduleComponent.affect))
    .flatMap(moduleComponent =>
      moduleComponent.streams.map((stream: ModuleComponentStreamOsidb): UpdateStreamOsim => ({
        ...stream,
        ps_component: moduleComponent.ps_component,
        ps_module: moduleComponent.ps_module,
        affectUuid: moduleComponent.affect.uuid as string,
      })),
    ).filter((stream: UpdateStreamOsim) => !alreadyFiledTrackers.value.find(
      (tracker: ZodTrackerTypeWithAffect) => tracker.ps_update_stream === stream.ps_update_stream
      && tracker.ps_component === stream.ps_component,
    )));

  const trackedAffectUuids = computed(() => affects.value.flatMap(
    affect => affect.trackers.flatMap(tracker => tracker.affects),
  ));

  const alreadyFiledTrackers = computed(() => affects.value.flatMap(
    (affect) => {
      const filedAffectTrackers = affect.trackers.filter(
        tracker => tracker.affects?.some(
          (affectUuid: string) => trackedAffectUuids.value.includes(affectUuid)),
      );

      return filedAffectTrackers.map(filedTracker => ({
        ...filedTracker,
        ...affect,
      }));
    }),
  );

  type AllowedResolution = ValueOf<typeof affectResolutions>;
  type AllowedResolutionGuard = typeof allowedResolutions[number] & ZodAffectType;

  const allowedResolutions: Nullable<AllowedResolution>[] = [
    affectResolutions.Delegated,
    affectResolutions.Empty,
  ];

  function isResolutionTrackable(affect: ZodAffectType): affect is AllowedResolutionGuard {
    return allowedResolutions.includes(affect.resolution);
  }

  const filteredSortedStreams = computed(
    (): UpdateStreamOsim[] => availableUpdateStreams.value
      .slice()
      .sort((a, b) => a.ps_update_stream.localeCompare(b.ps_update_stream))
      .filter(tracker =>
        filterString.value === ''
          ? tracker
          : tracker.ps_update_stream.toLowerCase().includes(filterString.value.toLowerCase())
          || tracker.ps_component?.toLowerCase().includes(filterString.value.toLowerCase()),
      ),
  );

  const filteredSelections = computed(() => Array.from(trackerSelections.value)
    .filter(([tracker]) => filteredSortedStreams.value
      .find(filteredStream => matchModuleComponent(tracker, filteredStream)),
    ),
  );

  const unselectedStreams = computed(
    (): UpdateStreamOsim[] => filteredSelections.value
      .filter(([, selected]) => !selected)
      .map(([tracker]) => tracker),
  );

  const selectedStreams = computed(
    (): UpdateStreamOsim[] => filteredSelections.value
      .filter(([, selected]) => selected)
      .map(([tracker]) => tracker),
  );

  const untrackedAffects = computed(() => affects.value.filter(affect => affect.trackers.length === 0));

  const untrackableAffects = computed(() => untrackedAffects.value
    .filter(affect =>
      isResolutionTrackable(affect) // Don't report affects that have invalid resolutions as untrackable
      && availableUpdateStreams.value.find(
        affect => undefined === availableUpdateStreams.value.find(
          stream => stream.ps_module === affect.ps_module && stream.ps_component === affect.ps_component,
        ),
      ),
    ),
  );

  watch(moduleComponents, () => {
    moduleComponents.value.forEach((moduleComponent) => {
      const affect = affects.value.find(matchingAffect =>
        matchingAffect.ps_component === moduleComponent.affect.ps_component
        && matchingAffect.ps_module === moduleComponent.affect.ps_module,
      );
      const trackers = availableUpdateStreams.value.filter(stream =>
        affect && stream.ps_component === affect.ps_component && stream.ps_module === affect.ps_module,
      );
      for (const tracker of trackers) {
        trackerSelections.value.set(tracker as UpdateStreamOsim, Boolean(tracker.selected));
      }
    });
  });

  loadTrackers(); // TODO: is this needed still?

  function setAllTrackerSelections(isSelected: boolean) {
    for (const stream of filteredSortedStreams.value) {
      trackerSelections.value.set(stream, isSelected);
    }
  }

  const trackersToFile = computed((): TrackersPost[] =>
    Array.from(trackerSelections.value)
      .filter(([, selected]) => selected)
      .map(([tracker]) => {
        const affect = affects.value.find(matchingAffect =>
          matchingAffect.ps_component === tracker.ps_component && matchingAffect.ps_module === tracker.ps_module);
        return {
          affects: [tracker.affectUuid],
          ps_update_stream: tracker.ps_update_stream,
          resolution: affect?.resolution,
          embargoed: affect?.embargoed,
          updated_dt: affect?.updated_dt,
        } as TrackersPost;
      }),
  );

  function loadTrackers() {
    if (relatedModuleComponents) {
      moduleComponents.value = relatedModuleComponents.value;
      return;
    }

    if (!flawUuid.value) {
      return;
    }

    isLoadingTrackers.value = true;

    return getTrackersForFlaws({ flaw_uuids: [flawUuid.value] })
      .then((response: any) => {
        moduleComponents.value = response.modules_components;
      })
      .catch(e => console.error('useTrackers::loadTrackers() Error loading trackers', e))
      .finally(() => isLoadingTrackers.value = false);
  }

  function getUpdateStreamsFor(module: string, component: string) {
    const moduleComponent = moduleComponents.value.find(
      ({ ps_component, ps_module }: ModuleComponent) => ps_module === module && ps_component === component,
    );
    return moduleComponent ? moduleComponent.streams : [];
  }

  function fileTrackers() {
    isFilingTrackers.value = true;
    return fileTrackingFor(trackersToFile.value)
      .then(loadTrackers)
      .catch(e => console.error('useTrackers::loadTrackers() Error filing trackers', e))
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
    filteredSortedStreams,
    unselectedStreams,
    selectedStreams,
    filterString,
    isFilingTrackers,
    isLoadingTrackers,
    affects,
  };
}
