import { ref } from 'vue';

import { useFlaw } from '@/composables/useFlaw';

import { getFlaw } from '@/services/FlawService';

export function useRefreshTrackers() {
  const flaw = useFlaw();
  const isRefreshingTrackers = ref(false);
  async function refreshTrackers() {
    try {
      isRefreshingTrackers.value = true;
      const freshFlaw = await getFlaw(flaw.value.uuid);
      if (freshFlaw) {
        flaw.value.affects.forEach((affect) => {
          const freshAffect = freshFlaw.affects.find(freshAffect => freshAffect.uuid === affect.uuid);
          if (freshAffect) {
            affect.trackers = freshAffect.trackers;
          }
        });
      }
    } finally {
      isRefreshingTrackers.value = false;
    }
  }

  return { isRefreshingTrackers, refreshTrackers };
}
