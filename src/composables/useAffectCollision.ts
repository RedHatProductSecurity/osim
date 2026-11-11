import { shallowRef, type ShallowRef } from 'vue';

import { createCatchHandler } from '@/composables/service-helpers';

import type { ZodAffectType } from '@/types';
import { getAffects, putAffects } from '@/services/AffectService';
import {
  affectFromChoices,
  createdAffectConflicts,
  deletionConflicts,
  rebaseAffects,
  type AffectRebaseField,
  type AffectRebaseResult,
} from '@/utils/affectRebase';
import { isFlawConflict, type CollisionChoice } from '@/utils/flawRebase';
import { deepCopyFromRaw } from '@/utils/helpers';

import { useFlaw } from './useFlaw';

type AffectList = ShallowRef<ZodAffectType[]>;

export type AffectCollisionState = {
  aliasAffectId: (from: string, to: string) => void;
  currentAffects: AffectList;
  initialAffects: AffectList;
  markNew: (uuid: string) => void;
  modifiedAffects: Set<string>;
  newAffects: Set<string>;
  refreshData: () => void;
  removedAffects: Set<string>;
};

type BulkFailure = { errors?: Record<string, string | string[]>; index?: number };

export type AffectUpdateResult = { hasErrors: boolean; results: ZodAffectType[] };

/** The affect list changed while a reload was in flight, so the response must not be applied. */
export class AffectReloadDiscarded extends Error {
  constructor() {
    super('Affect reload discarded because the flaw changed.');
    this.name = 'AffectReloadDiscarded';
  }
}

export function isAffectReloadDiscarded(error: unknown): boolean {
  return error instanceof AffectReloadDiscarded;
}

function loadServerAffects(flawId: string) {
  if (!flawId) return Promise.resolve([] as ZodAffectType[]);
  return getAffects(flawId, undefined, true).then(response => response.data.results);
}

function recordBulkFailures(errorTitle: string, failures: BulkFailure[]) {
  if (!failures.length) return false;
  createCatchHandler(errorTitle, false)(
    failures.flatMap(failure => Object.values(failure.errors ?? {}).flat()).join('\n'),
  );
  return true;
}

export function bulkFailures(payload: unknown): BulkFailure[] {
  const failed = (payload as { failed?: unknown } | null)?.failed;
  return Array.isArray(failed) ? failed : [];
}

export function isDuplicateAffectFailure(failure: BulkFailure): boolean {
  return /already exists/i.test(JSON.stringify(failure.errors ?? ''));
}

function isMissingAffect(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('response' in error)) return false;
  return (error as { response?: { status?: number } }).response?.status === 404;
}

export function isAlreadyDeleted(error: unknown): boolean {
  const data = (error as { response?: { data?: unknown } })?.response?.data;
  const text = typeof data === 'string' ? data : JSON.stringify(data ?? '');
  return /does not exist/i.test(text);
}

/**
 * Affect create, update, and delete conflicts for one affect list.
 * Create this inside useAffectsModel so the dialog and the save share one pending result.
 */
export function useAffectCollision(state: AffectCollisionState) {
  const {
    aliasAffectId,
    currentAffects,
    initialAffects,
    markNew,
    modifiedAffects,
    newAffects,
    refreshData,
    removedAffects,
  } = state;
  const pendingAffectConflict = shallowRef<AffectRebaseResult | null>(null);

  function adoptUnseenServerAffects(serverAffects: ZodAffectType[]) {
    const localUuids = new Set(currentAffects.value.flatMap(affect => affect.uuid ? [affect.uuid] : []));
    const localKeys = new Set(
      currentAffects.value.map(affect => `${affect.ps_update_stream}\0${affect.ps_component}`),
    );
    const unseen = serverAffects.filter(affect => affect.uuid
      && !localUuids.has(affect.uuid)
      && !removedAffects.has(affect.uuid)
      && !localKeys.has(`${affect.ps_update_stream}\0${affect.ps_component}`));
    if (!unseen.length) return;

    const copies = deepCopyFromRaw(unseen);
    currentAffects.value = [...currentAffects.value, ...copies];
    initialAffects.value = [...initialAffects.value, ...deepCopyFromRaw(unseen)];
    useFlaw().acceptAddedAffects(copies);
    refreshData();
  }

  async function readServerAffects(): Promise<null | ZodAffectType[]> {
    const { flaw } = useFlaw();
    const loadedFlaw = flaw.value;
    const flawId = loadedFlaw.uuid || loadedFlaw.cve_id || '';
    const affectsSnapshot = currentAffects.value;
    const baselineSnapshot = initialAffects.value;
    const serverAffects = await loadServerAffects(flawId);
    const stillHere = flaw.value === loadedFlaw
      && currentAffects.value === affectsSnapshot
      && initialAffects.value === baselineSnapshot;
    if (!stillHere) return null;
    adoptUnseenServerAffects(serverAffects);
    return serverAffects;
  }

  async function integrateServerAffects() {
    try {
      await readServerAffects();
    } catch (error) {
      console.error('useAffectCollision::integrateServerAffects() failed to reload affects', error);
    }
  }

  function editedAffects() {
    return currentAffects.value.filter(affect => affect.uuid && modifiedAffects.has(affect.uuid));
  }

  async function stageAffectConflicts() {
    const edited = editedAffects();
    if (!edited.length) {
      pendingAffectConflict.value = null;
      return;
    }
    try {
      const serverAffects = await readServerAffects();
      if (!serverAffects) return;
      pendingAffectConflict.value = rebaseAffects(initialAffects.value, edited, serverAffects);
    } catch (error) {
      console.error('useAffectCollision::stageAffectConflicts() failed to reload affects', error);
    }
  }

  function applyAffectResolution(choices: Readonly<Record<string, CollisionChoice>>) {
    const pending = pendingAffectConflict.value;
    if (!pending) return;

    const drop = new Set<string>();
    const recreate = new Map<string, ZodAffectType>();
    for (const affect of pending.removed) {
      const uuid = affect.uuid;
      if (!uuid) continue;
      if (choices[`${uuid}:removed`] === 'mine') {
        const localId = crypto.randomUUID();
        recreate.set(uuid, { ...affect, _uuid: localId, uuid: null });
        modifiedAffects.delete(uuid);
        markNew(localId);
      } else {
        drop.add(uuid);
        modifiedAffects.delete(uuid);
      }
    }

    const resolved = new Map(pending.updates.map(affect => [affect.uuid, affect]));
    for (const row of pending.conflicted) {
      const chosen = affectFromChoices(row, choices);
      if (chosen.uuid) resolved.set(chosen.uuid, chosen);
    }

    const restored = new Map<string, ZodAffectType>();
    for (const serverAffect of pending.blockedDeletes) {
      const uuid = serverAffect.uuid;
      if (!uuid || choices[`${uuid}:deleted`] === 'mine') continue;
      removedAffects.delete(uuid);
      restored.set(uuid, serverAffect);
    }

    currentAffects.value = currentAffects.value.flatMap((affect) => {
      const uuid = affect.uuid;
      if (uuid && drop.has(uuid)) return [];
      if (uuid && recreate.has(uuid)) return [recreate.get(uuid)!];
      const kept = uuid ? restored.get(uuid) : undefined;
      if (kept) return [{ ...kept, cvss_scores: affect.cvss_scores, tracker: affect.tracker }];
      const next = uuid ? resolved.get(uuid) : undefined;
      return [next ? { ...affect, ...next, cvss_scores: affect.cvss_scores, tracker: affect.tracker } : affect];
    });
    if (restored.size) {
      initialAffects.value = initialAffects.value.map((affect) => {
        const kept = affect.uuid ? restored.get(affect.uuid) : undefined;
        return kept ? { ...kept, cvss_scores: affect.cvss_scores, tracker: affect.tracker } : affect;
      });
    }
    const retired = [...drop, ...recreate.keys()];
    if (retired.length) {
      const gone = new Set(retired);
      initialAffects.value = initialAffects.value.filter(
        affect => !affect.uuid || !gone.has(affect.uuid),
      );
      useFlaw().dropAffects(retired);
    }
    refreshData();
  }

  async function saveAffectUpdates(toUpdate: ZodAffectType[]): Promise<AffectUpdateResult> {
    if (!toUpdate.length) return { hasErrors: false, results: [] };

    try {
      const response = await putAffects(toUpdate, { suppressConflictToast: true });
      return {
        hasErrors: recordBulkFailures('Error updating Affects:', bulkFailures(response?.data)),
        results: response?.data?.results ?? [],
      };
    } catch (error) {
      // A deleted affect is 404, not 409. Reload and let the dialog offer the local edit or the removal.
      if (!isFlawConflict(error) && !isMissingAffect(error)) throw error;

      let serverAffects: null | ZodAffectType[];
      try {
        serverAffects = await readServerAffects();
      } catch (reloadError) {
        console.error('useAffectCollision::saveAffectUpdates() failed to reload affects', reloadError);
        createCatchHandler('Error updating Affects:', false)(error);
        throw error;
      }
      if (!serverAffects) throw new AffectReloadDiscarded();

      const result = rebaseAffects(initialAffects.value, toUpdate, serverAffects);
      if (result.conflicts.length > 0) {
        pendingAffectConflict.value = result;
        throw error;
      }

      const retry = await putAffects(result.updates);
      return {
        hasErrors: recordBulkFailures('Error updating Affects:', bulkFailures(retry?.data)),
        results: retry?.data?.results ?? [],
      };
    }
  }

  async function reconcileDuplicateCreates(
    requested: ZodAffectType[],
    failed: BulkFailure[],
  ): Promise<{ adopted: ZodAffectType[]; conflict: boolean; hadOtherErrors: boolean }> {
    const duplicates = failed.filter(isDuplicateAffectFailure);
    const other = failed.filter(failure => !isDuplicateAffectFailure(failure));
    const hadOtherErrors = recordBulkFailures('Error creating Affects:', other);
    if (!duplicates.length) return { adopted: [], conflict: false, hadOtherErrors };

    let serverAffects: null | ZodAffectType[];
    try {
      serverAffects = await readServerAffects();
    } catch (error) {
      console.error('useAffectCollision::reconcileDuplicateCreates() failed to reload affects', error);
      recordBulkFailures('Error creating Affects:', duplicates);
      return { adopted: [], conflict: false, hadOtherErrors: true };
    }
    if (!serverAffects) throw new AffectReloadDiscarded();

    const adopted: ZodAffectType[] = [];
    const conflicts: AffectRebaseResult['conflicts'] = [];
    const conflicted: AffectRebaseResult['conflicted'] = [];
    const unmatched: BulkFailure[] = [];

    for (const failure of duplicates) {
      const requestedRow = typeof failure.index === 'number' ? requested[failure.index] : undefined;
      const mine = currentAffects.value.find(row => row._uuid && row._uuid === requestedRow?._uuid);
      const server = mine
        ? serverAffects.find(affect =>
          affect.ps_update_stream === mine.ps_update_stream && affect.ps_component === mine.ps_component)
        : undefined;
      if (!mine || !server?.uuid) {
        unmatched.push(failure);
        continue;
      }

      const rowConflicts = createdAffectConflicts(mine, server);
      if (!rowConflicts.length) {
        // CVSS stays on the local row until it is posted. Copying it here would
        // make the saved row look like it already had the score.
        adopted.push({ ...server, tracker: mine.tracker });
        continue;
      }

      // One identity after promotion: affectUUID prefers _uuid, which would
      // miss the server uuid now stored on the row and in modifiedAffects.
      if (mine._uuid) {
        aliasAffectId(mine._uuid, server.uuid);
        newAffects.delete(mine._uuid);
        delete mine._uuid;
      }
      mine.uuid = server.uuid;
      mine.updated_dt = server.updated_dt;
      if (server.ps_module) mine.ps_module = server.ps_module;
      modifiedAffects.add(server.uuid);
      initialAffects.value = [
        ...initialAffects.value.filter(affect => affect.uuid !== server.uuid),
        deepCopyFromRaw(server),
      ];
      conflicted.push({
        formEdits: rowConflicts.map(conflict => conflict.field as AffectRebaseField),
        mine,
        server,
      });
      conflicts.push(...rowConflicts);
    }

    const unmatchedErrors = recordBulkFailures('Error creating Affects:', unmatched);
    const conflict = conflicts.length > 0;
    if (conflict) {
      pendingAffectConflict.value = { blockedDeletes: [], conflicts, conflicted, removed: [], updates: [] };
      refreshData();
    }
    return { adopted, conflict, hadOtherErrors: hadOtherErrors || unmatchedErrors };
  }

  async function holdDeletesOfEditedAffects(uuids: string[]): Promise<'conflict' | 'discarded' | 'error' | 'ok'> {
    let serverAffects: null | ZodAffectType[];
    try {
      serverAffects = await readServerAffects();
    } catch (error) {
      console.error('useAffectCollision::holdDeletesOfEditedAffects() failed to reload affects', error);
      createCatchHandler('Error deleting Affect:', false)(error);
      return 'error';
    }
    if (!serverAffects) return 'discarded';

    const deleting = currentAffects.value.filter(affect => affect.uuid && uuids.includes(affect.uuid));
    const { blocked, conflicts } = deletionConflicts(initialAffects.value, deleting, serverAffects);
    if (!conflicts.length) return 'ok';

    pendingAffectConflict.value = {
      blockedDeletes: blocked,
      conflicted: [],
      conflicts,
      removed: [],
      updates: [],
    };
    return 'conflict';
  }

  return {
    applyAffectResolution,
    holdDeletesOfEditedAffects,
    integrateServerAffects,
    pendingAffectConflict,
    readServerAffects,
    reconcileDuplicateCreates,
    saveAffectUpdates,
    stageAffectConflicts,
  };
}
