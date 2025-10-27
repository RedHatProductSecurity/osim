import { computed, reactive, readonly, toRaw, shallowRef, triggerRef } from 'vue';

import { createSharedComposable } from '@vueuse/core';

import type { ZodAffectCVSSType, ZodAffectType } from '@/types';
import {
  deleteAffectCvssScore,
  deleteAffects,
  postAffectCvssScore,
  postAffects,
  putAffectCvssScore,
  putAffects,
} from '@/services/AffectService';
import { affectRhCvss3, affectUUID, deepCopyFromRaw, jsonEquals, mergeBy } from '@/utils/helpers';
import { fileTrackingFor } from '@/services/TrackerService';

import { useFlaw } from './useFlaw';

async function executeOperations<T>(operations: Array<Promise<T>>): Promise<{ failed: any[]; successful: T[] }> {
  const results = await Promise.allSettled(operations);
  const successful: T[] = [];
  const failed: any[] = [];

  for (const result of results) {
    if (result.status === 'fulfilled') {
      successful.push(result.value);
    } else {
      failed.push(result.reason?.data || result.reason);
    }
  }

  return { successful, failed };
}

function useAffects() {
  // Metadata
  const modifiedAffects = reactive<Set<string>>(new Set());
  const newAffects = reactive<Set<string>>(new Set());
  const removedAffects = reactive<Set<string>>(new Set());

  // Data
  const initialAffects = shallowRef<ZodAffectType[]>([]);
  const currentAffects = shallowRef<ZodAffectType[]>([]);
  const wereAffectsEditedOrAdded = computed(() => modifiedAffects.size || newAffects.size);
  const hasChanges = computed(() => wereAffectsEditedOrAdded.value || removedAffects.size);

  // Calculate a Map of UUID:index when affect array is updated (shallowRef)
  const affectUUIDMap = computed(() => new Map(currentAffects.value.map((a, i) => [affectUUID(a), i])));

  function initializeAffects(affects: ZodAffectType[]) {
    initialAffects.value = deepCopyFromRaw(toRaw(affects));
    currentAffects.value = deepCopyFromRaw(toRaw(affects));
    reset();
  }

  function reset() {
    modifiedAffects.clear();
    newAffects.clear();
    removedAffects.clear();
  }

  function resetSavedAffects(savedAffects: ZodAffectType[]) {
    // Create a set of saved affect UUIDs for quick lookup
    const savedUuids = new Set(savedAffects.map(affect => affect.uuid));

    // Remove successfully saved modified affects from tracking
    for (const uuid of modifiedAffects) {
      if (savedUuids.has(uuid)) {
        modifiedAffects.delete(uuid);
      }
    }

    // Remove successfully created affects from newAffects tracking
    // Match by comparing ps_update_stream, ps_module, and ps_component
    for (const affect of savedAffects) {
      // Find if this saved affect was previously tracked as new
      const wasNew = currentAffects.value.find(
        currentAffect =>
          currentAffect._uuid
          && newAffects.has(currentAffect._uuid)
          && currentAffect.ps_update_stream === affect.ps_update_stream
          && currentAffect.ps_module === affect.ps_module
          && currentAffect.ps_component === affect.ps_component,
      );

      if (wasNew?._uuid) {
        newAffects.delete(wasNew._uuid);
      }
    }
  }

  function markModified(uuid: string) {
    if (!newAffects.has(uuid)) {
      modifiedAffects.add(uuid);
    }
  }

  function markNew(uuid: string) {
    newAffects.add(uuid);
  }

  function markRemoved(uuid: string) {
    if (newAffects.has(uuid)) {
      newAffects.delete(uuid);
      currentAffects.value = currentAffects.value.filter(a => a._uuid !== uuid);
      return;
    }
    modifiedAffects.delete(uuid);
    removedAffects.add(uuid);
  }

  function revertAffect(uuid: string) {
    if (newAffects.has(uuid)) {
      // Remove new affect entirely from currentAffects
      newAffects.delete(uuid);
      currentAffects.value = currentAffects.value.filter(
        a => affectUUID(a) !== uuid,
      );
    } else if (removedAffects.has(uuid)) {
      // Restore removed affect
      removedAffects.delete(uuid);
    } else if (modifiedAffects.has(uuid)) {
      // Revert to initial state
      const originalAffect = initialAffects.value.find(
        a => a.uuid === uuid,
      );
      if (originalAffect) {
        const index = affectUUIDMap.value.get(uuid);
        if (index) {
          currentAffects.value[index] = structuredClone(toRaw(originalAffect));
        }
      }
      modifiedAffects.delete(uuid);
    }
  }

  function refreshData() {
    // Trigger reactivity for shallowRef after mutations
    triggerRef(currentAffects);
  }

  const requestBodyFromAffect = (affect: ZodAffectType) => ({
    ...affect,
    ps_component: affect.purl ? '' : affect.ps_component,
    embargoed: affect.embargoed || false,
  });

  function buildAffectOperations() {
    const toCreate: ZodAffectType[] = [];
    const toUpdate: ZodAffectType[] = [];

    for (const affect of currentAffects.value) {
      if (affect._uuid && newAffects.has(affect._uuid)) {
        toCreate.push(requestBodyFromAffect(affect));
      } else if (affect.uuid && modifiedAffects.has(affect.uuid)) {
        toUpdate.push(requestBodyFromAffect(affect));
      }
    }

    return { toCreate, toUpdate };
  }

  function buildCvssOperations(updatedAffects: ZodAffectType[]) {
    const toCreate: Record<string, ZodAffectCVSSType> = {};
    const toUpdate: Record<string, ZodAffectCVSSType> = {};
    const toDelete: Record<string, string> = {};

    // Process existing affects
    for (const affect of currentAffects.value) {
      const rhCvss3Score = affectRhCvss3(affect);

      if (affect.uuid && modifiedAffects.has(affect.uuid)) {
        const initialCvssScore = affectRhCvss3(initialAffects.value.find(({ uuid }) => affect.uuid === uuid)!);

        if (!rhCvss3Score?.uuid && rhCvss3Score?.score) {
          toCreate[affect.uuid] = rhCvss3Score;
        } else if (rhCvss3Score?.score && !jsonEquals(initialCvssScore, rhCvss3Score)) {
          toUpdate[affect.uuid] = rhCvss3Score;
        } else if (!rhCvss3Score?.score && initialCvssScore?.score) {
          toDelete[affect.uuid] = initialCvssScore.uuid!;
        }
      } else if (affect._uuid && newAffects.has(affect._uuid) && rhCvss3Score?.score) {
        // Find corresponding saved affect for new affects
        const matchingUpdatedAffect = updatedAffects.find(updatedAffect =>
          updatedAffect.ps_update_stream === affect.ps_update_stream
          && updatedAffect.ps_module === affect.ps_module
          && updatedAffect.ps_component === affect.ps_component,
        );

        if (matchingUpdatedAffect?.uuid) {
          toCreate[matchingUpdatedAffect.uuid] = rhCvss3Score;
        }
      }
    }

    return { toCreate, toUpdate, toDelete };
  }

  function updateCvssScoresInAffects(
    affects: ZodAffectType[],
    cvssScores: ZodAffectCVSSType[],
    deletedScores: Record<string, string>,
  ) {
    // Merge new/updated CVSS scores
    cvssScores.forEach((score) => {
      const affect = affects.find(affect => affect.uuid === score.affect);
      if (affect) {
        affect.cvss_scores = mergeBy(affect?.cvss_scores, [score], 'uuid');
      }
    });

    // Remove deleted CVSS scores
    for (const affectUuid in deletedScores) {
      const deletedScoreUuid = deletedScores[affectUuid];
      const affect = affects.find(affect => affect.uuid === affectUuid)
        || currentAffects.value.find(affect => affect.uuid === affectUuid);
      if (affect?.cvss_scores) {
        affect.cvss_scores = affect.cvss_scores.filter(score => score.uuid !== deletedScoreUuid);
      }
    }
  }

  async function saveCvssScores(updatedAffects: ZodAffectType[]) {
    const { toCreate, toDelete, toUpdate } = buildCvssOperations(updatedAffects);

    const operations = [
      ...Object.entries(toCreate).map(([affectUuid, cvssScore]) =>
        postAffectCvssScore(affectUuid, cvssScore),
      ),
      ...Object.entries(toUpdate).map(([affectUuid, cvssScore]) =>
        putAffectCvssScore(affectUuid, cvssScore.uuid!, cvssScore),
      ),
      ...Object.entries(toDelete).map(([affectUuid, scoreUuid]) =>
        deleteAffectCvssScore(affectUuid, scoreUuid),
      ),
    ];

    const { failed, successful: savedCvssScores } = await executeOperations(operations);

    // Update state with successful operations
    updateCvssScoresInAffects(updatedAffects, savedCvssScores.filter(Boolean), toDelete);

    return failed.length > 0;
  }

  async function saveAffects() {
    const { toCreate, toUpdate } = buildAffectOperations();

    const operations = [
      ...(toCreate.length ? [postAffects(toCreate)] : []),
      ...(toUpdate.length ? [putAffects(toUpdate)] : []),
    ];

    const { failed, successful: results } = await executeOperations(operations);

    // Flatten successful results
    const savedAffects: ZodAffectType[] = results.flatMap(result => result?.data.results ?? []);

    // Save CVSS scores (this also updates the affects)
    const cvssHasErrors = await saveCvssScores(savedAffects);

    const hasErrors = failed.length > 0 || cvssHasErrors;

    return { savedAffects, hasErrors };
  }

  type fileTrackerFields = Pick<ZodAffectType, 'ps_update_stream' | 'updated_dt' | 'uuid'>;
  async function fileTracker({ ps_update_stream, updated_dt, uuid }: fileTrackerFields) {
    const trackerToFile = {
      embargoed: useFlaw().flaw.value.embargoed,
      affects: [uuid!],
      ps_update_stream: ps_update_stream!,
      updated_dt: updated_dt!,
    };

    const result = await fileTrackingFor(trackerToFile);
    if (result && 'uuid' in result) {
      currentAffects.value.find(affect => affect.uuid === uuid)!.tracker = result;
    }
  }

  async function removeAffects() {
    const uuidsToDelete = [...removedAffects.values()];

    if (uuidsToDelete.length === 0) {
      return { deletedUuids: [], hasErrors: false };
    }

    try {
      await deleteAffects(uuidsToDelete);

      // If successful, remove from currentAffects and clear removedAffects tracking
      currentAffects.value = currentAffects.value.filter(({ uuid }) => !removedAffects.has(uuid!));
      removedAffects.clear();

      return { deletedUuids: uuidsToDelete, hasErrors: false };
    } catch (error) {
      // If delete fails, keep affects in removedAffects Set so user can retry
      // The error toast will be shown by the createCatchHandler in the service
      return { deletedUuids: [], hasErrors: true };
    }
  }

  return {
    state: {
      // Data
      currentAffects,
      initialAffects: readonly(initialAffects),

      // Metadata
      affectUUIDMap,
      hasChanges,
      modifiedAffects,
      newAffects,
      removedAffects,
      wereAffectsEditedOrAdded,
    },
    actions: {
      // Internal
      initializeAffects,
      markModified,
      markNew,
      markRemoved,
      refreshData,
      reset,
      resetSavedAffects,
      revertAffect,

      // External
      fileTracker,
      saveAffects,
      removeAffects,
    },

  };
}

export const useAffectsModel = createSharedComposable(useAffects);
