import { computed, reactive, readonly, toRaw, shallowRef, triggerRef } from 'vue';

import { createSharedComposable } from '@vueuse/core';

import {
  createCatchHandler,
  executeOperationsInParallel,
  showSuccessToast,
} from '@/composables/service-helpers';

import type { ZodAffectCVSSType, ZodAffectType } from '@/types';
import {
  deleteAffectCvssScore,
  deleteAffects,
  getAffect,
  postAffectCvssScore,
  postAffects,
  putAffectCvssScore,
  putAffects,
} from '@/services/AffectService';
import { affectRhCvss3, affectUUID, deepCopyFromRaw, jsonEquals, mergeBy } from '@/utils/helpers';
import { fileTrackingFor, findExistingTracker, parseTrackerId, updateExistingTracker } from '@/services/TrackerService';

import { useFlaw } from './useFlaw';

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
    if (!savedAffects.length) {
      return;
    }

    // Adopt the server identity for successfully created affects before merging.
    // New affects are tracked by a local _uuid and have no server uuid or
    // ps_module yet (OSIDB derives ps_module from ps_update_stream on creation),
    // so match them by ps_update_stream + ps_component. Assigning the saved uuid
    // and ps_module lets mergeBy replace the local affect in place (rather than
    // duplicating it) and ensures later edits are classified as updates.
    for (const affect of savedAffects) {
      const wasNew = currentAffects.value.find(
        currentAffect =>
          currentAffect._uuid
          && newAffects.has(currentAffect._uuid)
          && !currentAffect.uuid
          && currentAffect.ps_update_stream === affect.ps_update_stream
          && currentAffect.ps_component === affect.ps_component,
      );

      if (wasNew?._uuid) {
        wasNew.uuid = affect.uuid;
        wasNew.ps_module = affect.ps_module;
        newAffects.delete(wasNew._uuid);
      }
    }

    // Sync server data (e.g. updated_dt, ps_module) so later edits don't 409
    currentAffects.value = mergeBy(currentAffects.value, savedAffects, 'uuid');
    initialAffects.value = mergeBy(initialAffects.value, savedAffects, 'uuid');

    // Remove successfully saved modified affects from tracking
    const savedUuids = new Set(savedAffects.map(affect => affect.uuid));
    for (const uuid of modifiedAffects) {
      if (savedUuids.has(uuid)) {
        modifiedAffects.delete(uuid);
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
        if (index !== undefined) {
          // Create new array to trigger shallowRef reactivity
          currentAffects.value = currentAffects.value.map((affect, i) =>
            i === index ? structuredClone(toRaw(originalAffect)) : affect,
          );
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
        // Match by ps_update_stream and ps_component (ps_module is empty
        // locally until OSIDB derives it from ps_update_stream on creation)
        const matchingUpdatedAffect = updatedAffects.find(updatedAffect =>
          updatedAffect.ps_update_stream === affect.ps_update_stream
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

    const savedCvssScores: ZodAffectCVSSType[] = [];
    const deletedScores: Record<string, string> = {};

    // Create operations in parallel
    const createOps = Object.entries(toCreate).map(([affectUuid, cvssScore]) =>
      postAffectCvssScore(affectUuid, cvssScore),
    );

    const updateOps = Object.entries(toUpdate).map(([affectUuid, cvssScore]) =>
      putAffectCvssScore(affectUuid, cvssScore.uuid!, cvssScore),
    );

    const deleteOps = Object.entries(toDelete).map(([affectUuid, scoreUuid]) =>
      deleteAffectCvssScore(affectUuid, scoreUuid).then(() => ({ affectUuid, scoreUuid })),
    );

    // Execute all operations in parallel
    const createResults = await executeOperationsInParallel(createOps);
    const updateResults = await executeOperationsInParallel(updateOps);
    const deleteResults = await executeOperationsInParallel(deleteOps);

    // Collect successful results
    savedCvssScores.push(...createResults.successful, ...updateResults.successful);
    deleteResults.successful.forEach(({ affectUuid, scoreUuid }) => {
      deletedScores[affectUuid] = scoreUuid;
    });

    // Update state with successful operations
    updateCvssScoresInAffects(updatedAffects, savedCvssScores, deletedScores);

    // Show separate success notifications for each operation type
    showSuccessToast(createResults.successful.length, 'CVSS score', 'created');
    showSuccessToast(updateResults.successful.length, 'CVSS score', 'updated');
    showSuccessToast(deleteResults.successful.length, 'CVSS score', 'deleted');

    return createResults.hasErrors || updateResults.hasErrors || deleteResults.hasErrors;
  }

  async function saveAffects() {
    const { toCreate, toUpdate } = buildAffectOperations();

    // OSIDB bulk endpoints return 200 with per-item failures in `failed`
    const bulkOps = [
      ...(toCreate.length
        ? [{ errorTitle: 'Error creating Affects:', operation: 'created', request: postAffects(toCreate) }]
        : []),
      ...(toUpdate.length
        ? [{ errorTitle: 'Error updating Affects:', operation: 'updated', request: putAffects(toUpdate) }]
        : []),
    ];

    // Keep index alignment with bulkOps (unlike executeOperationsInParallel's compacted successful[])
    const settled = await Promise.allSettled(bulkOps.map(({ request }) => request));

    const savedAffects: ZodAffectType[] = [];
    let hasErrors = false;
    let hasBulkFailures = false;

    for (const [index, { errorTitle, operation }] of bulkOps.entries()) {
      const settledResult = settled[index];
      if (settledResult.status === 'rejected' || !settledResult.value?.data) {
        hasErrors = true;
        continue;
      }

      const { data } = settledResult.value;
      const successfulAffects = data.results ?? [];
      savedAffects.push(...successfulAffects);
      showSuccessToast(successfulAffects.length, 'affect', operation);

      const failures = data.failed ?? [];
      if (failures.length) {
        hasBulkFailures = true;
        createCatchHandler(errorTitle, false)(
          failures.flatMap((f: { errors?: Record<string, string | string[]> }) =>
            Object.values(f.errors ?? {}).flat(),
          ).join('\n'),
        );
      }
    }

    const cvssHasErrors = await saveCvssScores(savedAffects);

    return { savedAffects, hasErrors: hasErrors || hasBulkFailures || cvssHasErrors };
  }

  type fileTrackerFields = Pick<ZodAffectType, 'ps_update_stream' | 'updated_dt' | 'uuid'>;
  async function fileTracker(
    affectOrUuids: { affects: string[]; ps_update_stream: string } | fileTrackerFields,
  ) {
    if ('uuid' in affectOrUuids) {
      const { ps_update_stream, updated_dt, uuid } = affectOrUuids;
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
      return;
    }

    if (!('affects' in affectOrUuids)) return;
    const { affects, ps_update_stream } = affectOrUuids;
    const trackerToFile = {
      embargoed: useFlaw().flaw.value.embargoed,
      affects,
      ps_update_stream,
    };

    const result = await fileTrackingFor(trackerToFile);
    if (result && 'uuid' in result) {
      for (const affectUuid of affects) {
        const affect = currentAffects.value.find(a => a.uuid === affectUuid);
        if (affect) {
          affect.tracker = result;
        }
      }
    }
  }

  async function linkExistingTracker(affect: ZodAffectType, externalId: string): Promise<{ refreshFailed: boolean }> {
    if (!parseTrackerId(externalId)) throw new Error('Enter a valid Jira key or Bugzilla ID.');

    const { flaw, syncLinkedAffect } = useFlaw();
    const loadedFlaw = flaw.value;
    const initialSnapshot = initialAffects.value;
    const uuid = affect.uuid;
    const original = initialSnapshot.find(a => a.uuid === uuid);
    const current = () => currentAffects.value.find(a => a.uuid === uuid);
    const stillHere = () => flaw.value === loadedFlaw && initialAffects.value === initialSnapshot
      && current()?.uuid === uuid && !removedAffects.has(uuid!);

    if (!uuid || !loadedFlaw.uuid || !original || !stillHere() || newAffects.has(affect._uuid ?? uuid)) {
      throw new Error('Save this affect before linking a tracker.');
    }
    if (original.ps_update_stream !== current()!.ps_update_stream
      || original.ps_component !== current()!.ps_component) {
      throw new Error('Save affect stream and component changes before linking a tracker.');
    }

    const tracker = await findExistingTracker(externalId);
    if (!stillHere()) throw new Error('Flaw changed while linking. Try again.');
    if (current()!.tracker && current()!.tracker?.uuid !== tracker.uuid) {
      throw new Error('This affect already has a different tracker.');
    }

    // ponytail: This GET and the tracker PUT cannot atomically guard an affect being re-linked;
    // a server-side conditional link would be needed to close that race.
    let target: ZodAffectType;
    try {
      target = await getAffect(uuid);
    } catch (error: any) {
      if (error?.response?.status === 403 || error?.response?.status === 404) {
        throw new Error('Affect not found or inaccessible.');
      }
      throw error;
    }
    if (!stillHere()) throw new Error('Flaw changed while linking. Try again.');
    if (target.flaw !== loadedFlaw.uuid || target.ps_update_stream !== original.ps_update_stream
      || target.ps_component !== original.ps_component) {
      throw new Error('Affect stream, component or flaw changed. Reload before linking.');
    }
    if (original.updated_dt && target.updated_dt !== original.updated_dt) {
      throw new Error('This affect was modified. Reload before linking to preserve the latest changes.');
    }
    if (target.tracker && target.tracker.uuid !== tracker.uuid) {
      throw new Error('This affect already has a different tracker.');
    }
    if (tracker.ps_update_stream !== target.ps_update_stream) {
      throw new Error('Tracker and affect streams do not match.');
    }
    if (!target.tracker && tracker.affects.includes(uuid)) {
      throw new Error('Tracker association changed. Reload before linking.');
    }

    if (!target.tracker) {
      // The server enforces this too; compare an existing source when one is accessible.
      for (const sourceUuid of tracker.affects) {
        try {
          const source = await getAffect(sourceUuid);
          if (source.ps_update_stream !== target.ps_update_stream || source.ps_component !== target.ps_component) {
            throw new Error('Tracker and affect stream/component do not match.');
          }
          break;
        } catch (error: any) {
          if (error?.response?.status !== 403 && error?.response?.status !== 404) throw error;
        }
      }
    }
    if (!stillHere()) throw new Error('Flaw changed while linking. Try again.');
    if (current()!.ps_update_stream !== original.ps_update_stream
      || current()!.ps_component !== original.ps_component
      || (current()!.tracker && current()!.tracker?.uuid !== tracker.uuid)) {
      throw new Error('Affect changed while linking. Try again.');
    }

    // A server-linked affect needs no PUT; never overwrite an existing association.
    const linked = target.tracker ? tracker : await updateExistingTracker(tracker, uuid);
    let refreshFailed = false;
    let refreshed = target;
    if (!target.tracker) {
      try {
        refreshed = await getAffect(uuid);
        if (refreshed.tracker?.uuid !== tracker.uuid) throw new Error('Tracker was not returned on the affect.');
      } catch {
        refreshFailed = true;
      }
    }
    if (stillHere()) {
      const resolvedTracker = refreshed.tracker?.uuid === tracker.uuid ? refreshed.tracker : linked;
      const timestamp = refreshFailed ? undefined : refreshed.updated_dt;
      currentAffects.value = currentAffects.value.map(a => a.uuid === uuid
        ? { ...a, tracker: resolvedTracker, ...(timestamp ? { updated_dt: timestamp } : {}) }
        : a);
      initialAffects.value = initialAffects.value.map(a => a.uuid === uuid
        ? { ...a, tracker: resolvedTracker, ...(timestamp ? { updated_dt: timestamp } : {}) }
        : a);
      syncLinkedAffect(loadedFlaw, uuid, resolvedTracker, timestamp);
    }
    return { refreshFailed };
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

      // Show success notification
      showSuccessToast(uuidsToDelete.length, 'affect', 'deleted');

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
      linkExistingTracker,
      saveAffects,
      removeAffects,
    },

  };
}

export const useAffectsModel = createSharedComposable(useAffects);
