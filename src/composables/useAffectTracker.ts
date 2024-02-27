import { ref } from 'vue';
import { fileTracker, type TrackersFilePost, postTracker } from '@/services/TrackerService';

export function useAffectTracker(affectUuid: string, module: string, component: string) {
  const moduleComponentStreams = ref<string[]>([]);
  const isNotApplicable = ref(false);

  function isAffectNotApplicable(response: any) {
    return response.not_applicable.some(
      (irrelevantAffect: any) =>
        irrelevantAffect.ps_module === module && irrelevantAffect.ps_component === component,
    );
  }

  async function getTrackers() {
    try {
      const response = await fileTracker({ flaw_uuids: [affectUuid] } as TrackersFilePost);
      if (isAffectNotApplicable(response)) {
        isNotApplicable.value = true;
        return;
      }

      const moduleComponent = response.modules_components.find(
        ({ps_module, ps_component}: any) =>
          ps_module === module && ps_component === component,
      );
      if (moduleComponent) {
        moduleComponentStreams.value = moduleComponent.streams;
      }
    } catch (error) {
      console.error(error);
    }
  }

  return {
    moduleComponentStreams,
    isNotApplicable,
    getTrackers,
    postTracker
  };
}
