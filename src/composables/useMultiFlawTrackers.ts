import { computed, reactive } from 'vue';

import { createSharedComposable } from '@vueuse/core';

import { getAffects } from '@/services/AffectService';
import { useToastStore } from '@/stores/ToastStore';
import { parseOsidbErrors } from '@/services/osidb-errors-helpers';
import { isCveValid, isUUID4Valid } from '@/utils/helpers';
import type { ZodAffectType } from '@/types';

import { useFlaw } from './useFlaw';

function getStreamKey(
  { ps_component, ps_update_stream }:
  Pick<ZodAffectType, 'ps_component' | 'ps_update_stream'>,
): string {
  return `${ps_update_stream}:${ps_component}`;
}

function getFlawIdentifier(affect: { cve_id?: null | string } & ZodAffectType): null | string {
  return affect.cve_id ?? affect.flaw ?? null;
}

function isIdValid(identifier: string): boolean {
  return isCveValid(identifier) || isUUID4Valid(identifier);
}

function useMultiFlawTrackersComposable() {
  const { flaw } = useFlaw();

  const relatedAffects = reactive(new Map<string, 'error' | 'loading' | ZodAffectType[]>());

  // O(1) lookups
  const currentFlawStreamMap = computed(() => {
    const flawMap = new Map<string, string>();
    for (const affect of flaw.value.affects) {
      if (!affect.tracker && affect.uuid) {
        const streamKey = getStreamKey(affect);
        flawMap.set(streamKey, affect.uuid);
      }
    }
    return flawMap;
  });

  const streamData = computed(() => {
    const sharedStreams: Record<string, string[]> = {};
    const streamToCveMap: Record<string, Set<string>> = {};
    const cveStreamCount: Record<string, Set<string>> = {};

    for (const affects of relatedAffects.values()) {
      if (typeof affects === 'string') continue;

      for (const affect of affects as Array<{ cve_id?: null | string } & ZodAffectType>) {
        const streamKey = getStreamKey(affect);

        const currentFlawAffectUuid = currentFlawStreamMap.value.get(streamKey);
        if (!currentFlawAffectUuid) continue;

        if (affect.uuid) {
          if (!sharedStreams[streamKey]) {
            sharedStreams[streamKey] = [currentFlawAffectUuid];
          }
          sharedStreams[streamKey].push(affect.uuid);
        }

        const flawId = getFlawIdentifier(affect);
        if (flawId) {
          if (!streamToCveMap[streamKey]) {
            streamToCveMap[streamKey] = new Set([flaw.value.cve_id || flaw.value.uuid]);
          }
          streamToCveMap[streamKey].add(flawId);

          if (!cveStreamCount[flawId]) {
            cveStreamCount[flawId] = new Set();
          }
          cveStreamCount[flawId].add(streamKey);
        }
      }
    }

    return {
      sharedStreams,
      streamToCveMap: Object.fromEntries(
        Object.entries(streamToCveMap).map(([stream, cveSet]) => [stream, Array.from(cveSet)]),
      ),
      cveStreamCount: Object.fromEntries(
        Object.entries(cveStreamCount).map(([cveId, streamSet]) => [cveId, streamSet.size]),
      ),
    };
  });

  const sharedStreams = computed(() => streamData.value.sharedStreams);
  const streamToCveMap = computed(() => streamData.value.streamToCveMap);
  const cveStreamCount = computed(() => streamData.value.cveStreamCount);

  function addFlaw(identifier: string) {
    if (!isIdValid(identifier) || relatedAffects.has(identifier)) {
      return;
    }

    const tmpId = identifier;
    relatedAffects.set(identifier, 'loading');

    getAffects(tmpId)
      .then(({ data }) => {
        relatedAffects.set(tmpId, data.results);
      })
      .catch((error) => {
        relatedAffects.set(tmpId, 'error');
        useToastStore().addToast({
          body: parseOsidbErrors(error),
          title: `Failed to load ${tmpId}`,
          css: 'warning',
        });
      });
  }

  function removeFlaw(id: string) {
    relatedAffects.delete(id);
  }

  function getRelatedCvesForAffect(affect: ZodAffectType): string[] {
    const streamKey = getStreamKey(affect);
    const cves = streamToCveMap.value[streamKey] || [];

    return cves.filter(cve => cve !== flaw.value.cve_id && cve !== flaw.value.uuid);
  }

  function getAffectUuidsForStream(streamKey: string): string[] {
    return sharedStreams.value[streamKey] || [];
  }

  // eslint-disable-next-line unicorn/consistent-function-scoping
  function validateId(identifier: string): boolean {
    return isIdValid(identifier);
  }

  return {
    state: {
      relatedAffects,
    },
    computed: {
      currentFlawStreamMap,
      sharedStreams,
      streamToCveMap,
      cveStreamCount,
    },
    actions: {
      addFlaw,
      removeFlaw,
      getRelatedCvesForAffect,
      getAffectUuidsForStream,
      validateId,
    },
  };
}

export const useMultiFlawTrackers = createSharedComposable(useMultiFlawTrackersComposable);
