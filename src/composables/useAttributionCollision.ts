import { shallowRef } from 'vue';

import { createCatchHandler } from '@/composables/service-helpers';
import { useFlaw } from '@/composables/useFlaw';

import type { ZodFlawAcknowledgmentType, ZodFlawReferenceType, ZodFlawType } from '@/types';
import { getFlaw } from '@/services/FlawService';
import { useToastStore } from '@/stores/ToastStore';
import {
  ACKNOWLEDGMENT_CONFIG,
  REFERENCE_CONFIG,
  applyAttributionChoices,
  itemsEqual,
  rebaseAttributionCollection,
  type AttributionChoiceResult,
  type AttributionConfig,
  type AttributionItem,
  type AttributionRebaseResult,
} from '@/utils/attributionRebase';
import { isFlawConflict, type CollisionChoice } from '@/utils/flawRebase';

/** Flaw collection keys holding references and acknowledgments. */
export type AttributionCollection = 'acknowledgments' | 'references';

/** Both attribution collections as last read from the server. */
export type ServerAttributions = Pick<ZodFlawType, 'acknowledgments' | 'references'>;

/** Staged rebase results behind the collision dialog, one per conflicted kind. */
export type PendingAttributionConflict = {
  acknowledgments: AttributionRebaseResult<ZodFlawAcknowledgmentType> | null;
  references: AttributionRebaseResult<ZodFlawReferenceType> | null;
  /** Server collections the results were rebased against; the new save baseline. */
  server: ServerAttributions;
};

/** Item savers from useFlawAttributionsModel, reused by the retry and resolution paths. */
type AttributionItemSavers<TItem> = {
  create: (item: TItem) => Promise<unknown>;
  update: (item: TItem) => Promise<unknown>;
};

export type AttributionCollisionState = {
  acknowledgments: AttributionItemSavers<ZodFlawAcknowledgmentType>;
  references: AttributionItemSavers<ZodFlawReferenceType>;
};

const CONFLICT_TOAST_TITLES: Record<AttributionCollection, string> = {
  acknowledgments: 'Error updating Acknowledgment:',
  references: 'Error updating Reference:',
};

/** 404 is an item the server no longer has; the dialog offers the local edit or the removal. */
export function isMissingAttribution(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('response' in error)) return false;
  return (error as { response?: { status?: number } }).response?.status === 404;
}

/** 409 is a stale updated_dt and 404 a server-side removal; both reconcile through the dialog. */
export function isAttributionConflict(error: unknown): boolean {
  return isFlawConflict(error) || isMissingAttribution(error);
}

/** The server reports the item is already gone; a local delete can treat it as done. */
export function isAlreadyDeleted(error: unknown): boolean {
  const data = (error as { response?: { data?: unknown } })?.response?.data;
  const text = typeof data === 'string' ? data : JSON.stringify(data ?? '');
  return /does not exist/i.test(text);
}

type ResolvedAttributionCollection<TItem> = {
  /** The rewritten collection with server adoptions and user choices applied. */
  collection: TItem[];
  /** Cleared copies of items kept over a server removal; POST them as new. */
  recreate: TItem[];
};

/**
 * Rewrite a collection from a rebase result. With choices, conflicted rows take
 * the picked side; without (the adopt path), only the non-conflicting server
 * changes fold in. Items without a uuid are local-new and pass through.
 */
function resolveAttributionCollection<TItem extends AttributionItem>(
  current: readonly TItem[],
  result: AttributionRebaseResult<TItem>,
  outcome: AttributionChoiceResult<TItem> | null,
): ResolvedAttributionCollection<TItem> {
  const dropUuids = new Set(outcome?.drop ?? []);
  const keepMineByUuid = new Map((outcome?.keepMine ?? [])
    .flatMap(item => item.uuid ? [[item.uuid, item] as const] : []));
  const adoptServerByUuid = new Map((outcome?.adoptServer ?? [])
    .flatMap(item => item.uuid ? [[item.uuid, item] as const] : []));
  const adoptedUpdateByUuid = new Map(result.adoptedUpdates
    .flatMap(item => item.uuid ? [[item.uuid, item] as const] : []));
  const serverRemovals = new Set(result.adoptedRemovals);
  // applyAttributionChoices clears the uuid of kept removals, so recover those
  // rows as the removed rows minus the drops the user accepted.
  const recreateUuids = new Set(result.conflictedRows
    .filter(row => row.server === null && !dropUuids.has(row.uuid))
    .map(row => row.uuid));

  const recreate: TItem[] = [];
  const kept = current.flatMap((item) => {
    const uuid = item.uuid;
    if (!uuid) return [item];
    if (dropUuids.has(uuid) || serverRemovals.has(uuid)) return [];
    if (recreateUuids.has(uuid)) {
      const cleared = { ...item, updated_dt: null, uuid: '' };
      recreate.push(cleared);
      return [cleared];
    }
    const chosen = keepMineByUuid.get(uuid) ?? adoptServerByUuid.get(uuid) ?? adoptedUpdateByUuid.get(uuid);
    return [chosen ?? item];
  });
  return { collection: [...kept, ...result.adoptedAdditions], recreate };
}

/** Re-save the items a conflict interrupted, stamped with the server tokens. */
async function retryUnsavedItems<TItem extends AttributionItem>(
  unsaved: readonly TItem[],
  current: readonly TItem[],
  serverItems: readonly TItem[],
  savers: AttributionItemSavers<TItem>,
): Promise<void> {
  const serverByUuid = new Map(serverItems.flatMap(item => item.uuid ? [[item.uuid, item] as const] : []));
  for (const item of unsaved) {
    if (!item.uuid) {
      await savers.create(item);
      continue;
    }
    const local = current.find(currentItem => currentItem.uuid === item.uuid);
    // Adoption dropped items the server removed; nothing is left to save for them.
    if (!local) continue;
    const serverItem = serverByUuid.get(item.uuid);
    await savers.update(serverItem ? { ...local, updated_dt: serverItem.updated_dt } : local);
  }
}

/** Re-save the picked sides: kept items with the server token, kept removals as new items. */
async function resaveResolvedChoices<TItem extends AttributionItem>(
  outcome: AttributionChoiceResult<TItem>,
  recreate: readonly TItem[],
  savers: AttributionItemSavers<TItem>,
): Promise<void> {
  for (const item of outcome.keepMine) {
    await savers.update(item);
  }
  for (const item of recreate) {
    await savers.create(item);
  }
}

/**
 * Adopted server updates the local copy cannot see yet. Converged updates —
 * the form already holds the server values, e.g. items it just saved — are
 * not changes worth reporting or adopting.
 */
function unseenServerUpdates<TItem extends AttributionItem, TField extends keyof TItem & string>(
  config: AttributionConfig<TItem, TField>,
  result: AttributionRebaseResult<TItem>,
  mine: readonly TItem[],
): TItem[] {
  const mineByUuid = new Map(mine.flatMap(item => item.uuid ? [[item.uuid, item] as const] : []));
  return result.adoptedUpdates.filter((serverItem) => {
    const local = mineByUuid.get(serverItem.uuid);
    return local === undefined || !itemsEqual(local, serverItem, config.fields);
  });
}

/** Labels for the items the server removed while the form left them alone. */
function removalLabels<TItem extends AttributionItem>(
  labelItem: (item: TItem) => string,
  removals: readonly string[],
  current: readonly TItem[],
): string[] {
  return removals.flatMap((uuid) => {
    const item = current.find(currentItem => currentItem.uuid === uuid);
    return item ? [labelItem(item)] : [];
  });
}

/** Mirrors useFlawModel's toastAdoptedFields for adopted reference and acknowledgment items. */
function toastAdoptedAttributions(labels: readonly string[]) {
  if (labels.length === 0) return;
  const { addToast } = useToastStore();
  addToast({
    title: 'Flaw saved with newer changes',
    body: `Kept your edits and took server updates for ${labels.join(', ')}.`,
    css: 'info',
  });
}

/** Companion to the adoption toast for items the server removed. */
function toastRemovedAttributions(labels: readonly string[]) {
  if (labels.length === 0) return;
  const { addToast } = useToastStore();
  addToast({
    title: 'Flaw saved with newer changes',
    body: `Kept your edits and took server removals for ${labels.join(', ')}.`,
    css: 'info',
  });
}

type AttributionKindMerge<TItem> = {
  /** Whether the merge staged conflicts or applied server changes for this kind. */
  acted: boolean;
  /** Toast labels for the adopted changes the local copy cannot see. */
  adoptedLabels: string[];
  /** The working array: merged, or the local array when nothing applied. */
  collection: TItem[];
  /** Toast labels for the items the server removed. */
  removedLabels: string[];
};

/**
 * Merge one collection against the server. Conflicts stage the collision
 * dialog and leave the local array untouched; otherwise server-only changes
 * the local copy cannot see adopt. Updates the form already holds — converged
 * with the server, e.g. items it just saved — adopt nothing, toast nothing,
 * and re-baseline nothing.
 */
function mergeAttributionKind<TItem extends AttributionItem, TField extends keyof TItem & string>(
  config: AttributionConfig<TItem, TField>,
  base: readonly TItem[],
  mine: TItem[],
  serverItems: readonly TItem[],
  stage: (result: AttributionRebaseResult<TItem>) => void,
): AttributionKindMerge<TItem> {
  const result = rebaseAttributionCollection(base, mine, serverItems, config);
  if (result.conflicts.length > 0) {
    stage(result);
    return { acted: true, adoptedLabels: [], collection: mine, removedLabels: [] };
  }

  const unseenUpdates = unseenServerUpdates(config, result, mine);
  const acted = unseenUpdates.length > 0
    || result.adoptedAdditions.length > 0
    || result.adoptedRemovals.length > 0;
  if (!acted) {
    return { acted: false, adoptedLabels: [], collection: mine, removedLabels: [] };
  }

  return {
    acted: true,
    adoptedLabels: [
      ...unseenUpdates.map(config.itemLabel),
      ...result.adoptedAdditions.map(config.itemLabel),
    ],
    collection: resolveAttributionCollection(mine, result, null).collection,
    removedLabels: removalLabels(config.itemLabel, result.adoptedRemovals, mine),
  };
}

/**
 * Reference and acknowledgment save conflicts for one flaw.
 * Create this inside useFlawAttributionsModel so the dialog and the save share one pending result.
 */
export function useAttributionCollision(state: AttributionCollisionState) {
  const { acceptServerCollections, flaw, initialFlaw } = useFlaw();
  const pendingAttributionConflict = shallowRef<null | PendingAttributionConflict>(null);

  /** Fresh server collections; the flaw model itself is left untouched. */
  async function readServerAttributions(): Promise<ServerAttributions> {
    const uuid = flaw.value.uuid;
    if (!uuid) throw new Error('useAttributionCollision::readServerAttributions() flaw has no uuid');
    const serverFlaw = await getFlaw(uuid, true);
    return { acknowledgments: serverFlaw.acknowledgments, references: serverFlaw.references };
  }

  /**
   * Reconcile a 409/404 from an item save. Either stages the conflicts for the
   * collision dialog and rethrows the save error (so the edit list stays dirty),
   * or adopts the server changes and retries the remaining unsaved items.
   */
  async function stageAttributionConflicts(
    kind: AttributionCollection,
    error: unknown,
    unsaved: readonly (ZodFlawAcknowledgmentType | ZodFlawReferenceType)[],
  ): Promise<void> {
    let server: ServerAttributions;
    try {
      server = await readServerAttributions();
    } catch (reloadError) {
      console.error('useAttributionCollision::stageAttributionConflicts() failed to reload flaw', reloadError);
      createCatchHandler(CONFLICT_TOAST_TITLES[kind], false)(error);
      throw error;
    }

    if (kind === 'references') {
      const result = rebaseAttributionCollection(
        // The rebase only reads the baseline; initialFlaw exposes it read-only.
        initialFlaw.value.references as ZodFlawReferenceType[],
        flaw.value.references,
        server.references,
        REFERENCE_CONFIG,
      );
      if (result.conflicts.length > 0) {
        pendingAttributionConflict.value = {
          acknowledgments: pendingAttributionConflict.value?.acknowledgments ?? null,
          references: result,
          server,
        };
        throw error;
      }
      const resolved = resolveAttributionCollection(flaw.value.references, result, null);
      flaw.value.references = resolved.collection;
      await retryUnsavedItems(
        unsaved as readonly ZodFlawReferenceType[],
        resolved.collection,
        server.references,
        state.references,
      );
      return;
    }

    const result = rebaseAttributionCollection(
      // The rebase only reads the baseline; initialFlaw exposes it read-only.
      initialFlaw.value.acknowledgments as ZodFlawAcknowledgmentType[],
      flaw.value.acknowledgments,
      server.acknowledgments,
      ACKNOWLEDGMENT_CONFIG,
    );
    if (result.conflicts.length > 0) {
      pendingAttributionConflict.value = {
        acknowledgments: result,
        references: pendingAttributionConflict.value?.references ?? null,
        server,
      };
      throw error;
    }
    const resolved = resolveAttributionCollection(flaw.value.acknowledgments, result, null);
    flaw.value.acknowledgments = resolved.collection;
    await retryUnsavedItems(
      unsaved as readonly ZodFlawAcknowledgmentType[],
      resolved.collection,
      server.acknowledgments,
      state.acknowledgments,
    );
  }

  /** Apply the dialog picks, baseline the server collections, and re-save the kept items. */
  async function applyAttributionResolution(choices: Readonly<Record<string, CollisionChoice>>) {
    const pending = pendingAttributionConflict.value;
    if (!pending) return;

    const resolutions: {
      acknowledgments: {
        outcome: AttributionChoiceResult<ZodFlawAcknowledgmentType>;
        recreate: ZodFlawAcknowledgmentType[];
      } | null;
      references: {
        outcome: AttributionChoiceResult<ZodFlawReferenceType>;
        recreate: ZodFlawReferenceType[];
      } | null;
    } = { acknowledgments: null, references: null };

    if (pending.references) {
      const outcome = applyAttributionChoices(pending.references.conflictedRows, choices);
      const resolved = resolveAttributionCollection(flaw.value.references, pending.references, outcome);
      flaw.value.references = resolved.collection;
      resolutions.references = { outcome, recreate: resolved.recreate };
    }
    if (pending.acknowledgments) {
      const outcome = applyAttributionChoices(pending.acknowledgments.conflictedRows, choices);
      const resolved = resolveAttributionCollection(flaw.value.acknowledgments, pending.acknowledgments, outcome);
      flaw.value.acknowledgments = resolved.collection;
      resolutions.acknowledgments = { outcome, recreate: resolved.recreate };
    }

    acceptServerCollections(pending.server);
    pendingAttributionConflict.value = null;

    if (resolutions.references) {
      await resaveResolvedChoices(resolutions.references.outcome, resolutions.references.recreate, state.references);
    }
    if (resolutions.acknowledgments) {
      await resaveResolvedChoices(
        resolutions.acknowledgments.outcome,
        resolutions.acknowledgments.recreate,
        state.acknowledgments,
      );
    }

    await integrateServerAttributions();
  }

  /**
   * Fetch the server collections and fold them in. Runs after a save finishes:
   * just-saved items compare equal against their synced responses, so only
   * unseen server changes adopt. A flaw without a uuid has nothing to fetch.
   */
  async function integrateServerAttributions(): Promise<void> {
    if (!flaw.value.uuid) return;
    let server: ServerAttributions;
    try {
      server = await readServerAttributions();
    } catch (error) {
      console.error('useAttributionCollision::integrateServerAttributions() failed to reload flaw', error);
      return;
    }
    mergeServerAttributions(server);
  }

  /**
   * Fold server-side additions, updates, and removals of both kinds into the
   * local model, staging any both-side overlap for the collision dialog.
   * Returns the working arrays — merged, or still local when a kind staged
   * conflicts or had nothing to adopt — for callers that apply them through a
   * deferred setFlaw. Only kinds the merge acted on re-baseline.
   */
  function mergeServerAttributions(server: ServerAttributions): ServerAttributions {
    const referencesMerge = mergeAttributionKind(
      REFERENCE_CONFIG,
      // The rebase only reads the baseline; initialFlaw exposes it read-only.
      initialFlaw.value.references as ZodFlawReferenceType[],
      flaw.value.references,
      server.references,
      (result) => {
        pendingAttributionConflict.value = {
          acknowledgments: pendingAttributionConflict.value?.acknowledgments ?? null,
          references: result,
          server,
        };
      },
    );
    if (referencesMerge.acted) {
      flaw.value.references = referencesMerge.collection;
    }

    const acknowledgmentsMerge = mergeAttributionKind(
      ACKNOWLEDGMENT_CONFIG,
      // The rebase only reads the baseline; initialFlaw exposes it read-only.
      initialFlaw.value.acknowledgments as ZodFlawAcknowledgmentType[],
      flaw.value.acknowledgments,
      server.acknowledgments,
      (result) => {
        pendingAttributionConflict.value = {
          acknowledgments: result,
          references: pendingAttributionConflict.value?.references ?? null,
          server,
        };
      },
    );
    if (acknowledgmentsMerge.acted) {
      flaw.value.acknowledgments = acknowledgmentsMerge.collection;
    }

    acceptServerCollections({
      ...(acknowledgmentsMerge.acted && { acknowledgments: server.acknowledgments }),
      ...(referencesMerge.acted && { references: server.references }),
    });
    toastAdoptedAttributions([...referencesMerge.adoptedLabels, ...acknowledgmentsMerge.adoptedLabels]);
    toastRemovedAttributions([...referencesMerge.removedLabels, ...acknowledgmentsMerge.removedLabels]);
    return { acknowledgments: acknowledgmentsMerge.collection, references: referencesMerge.collection };
  }

  return {
    applyAttributionResolution,
    integrateServerAttributions,
    mergeServerAttributions,
    pendingAttributionConflict,
    readServerAttributions,
    stageAttributionConflicts,
  };
}
