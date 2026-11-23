import type { ZodFlawAcknowledgmentType, ZodFlawReferenceType } from '@/types';
import {
  formatCollisionValue,
  type CollisionChoice,
} from '@/utils/flawRebase';
import { jsonEquals } from '@/utils/helpers';

/**
 * Reference fields a save can overwrite. The remaining FlawReferenceSchema
 * fields (uuid, embargoed, updated_dt, alerts) are server-managed and never compared.
 */
export const REFERENCE_FIELDS = [
  'url',
  'description',
  'type',
] as const satisfies readonly (keyof ZodFlawReferenceType)[];

export type ReferenceField = typeof REFERENCE_FIELDS[number];

/**
 * Acknowledgment fields a save can overwrite. The remaining FlawAcknowledgmentSchema
 * fields (uuid, embargoed, created_dt, updated_dt, alerts, flaw) are server-managed
 * and never compared.
 */
export const ACKNOWLEDGMENT_FIELDS = [
  'name',
  'affiliation',
  'from_upstream',
] as const satisfies readonly (keyof ZodFlawAcknowledgmentType)[];

export type AcknowledgmentField = typeof ACKNOWLEDGMENT_FIELDS[number];

const REFERENCE_FIELD_LABELS: Record<ReferenceField, string> = {
  description: 'Description',
  type: 'Reference type',
  url: 'Link URL',
};

const ACKNOWLEDGMENT_FIELD_LABELS: Record<AcknowledgmentField, string> = {
  affiliation: 'Affiliation',
  from_upstream: 'From upstream',
  name: 'Name',
};

/** Attribution collections handled by this module. */
export type AttributionKind = 'acknowledgment' | 'reference';

const KIND_LABELS: Record<AttributionKind, string> = {
  acknowledgment: 'Acknowledgment',
  reference: 'Reference',
};

/** Minimal shape shared by flaw references and acknowledgments. */
export type AttributionItem = {
  /** Concurrency token from the server; null while the item is unsaved. */
  updated_dt?: null | string;
  /** Server-assigned identity; blank while the item is unsaved. */
  uuid: string;
};

export type AttributionConfig<TItem extends AttributionItem, TField extends keyof TItem & string> = {
  /** Label for each compared field, used by the summaries. */
  fieldLabels: Record<TField, string>;
  /** User-editable fields the rebase compares. */
  fields: readonly TField[];
  /** Short item label for dialog rows. */
  itemLabel: (item: TItem) => string;
  /** Choice-id namespace for this kind. */
  kind: AttributionKind;
};

export const REFERENCE_CONFIG: AttributionConfig<ZodFlawReferenceType, ReferenceField> = {
  fieldLabels: REFERENCE_FIELD_LABELS,
  fields: REFERENCE_FIELDS,
  itemLabel: item => item.url || 'Reference',
  kind: 'reference',
};

export const ACKNOWLEDGMENT_CONFIG: AttributionConfig<ZodFlawAcknowledgmentType, AcknowledgmentField> = {
  fieldLabels: ACKNOWLEDGMENT_FIELD_LABELS,
  fields: ACKNOWLEDGMENT_FIELDS,
  itemLabel: item => item.name || 'Acknowledgment',
  kind: 'acknowledgment',
};

/** One item changed on both sides, formatted for the collision dialog. */
export type AttributionConflict = {
  /** Short item label, e.g. the reference url or acknowledgment name. */
  itemLabel: string;
  /** Item kind; combined with the uuid to build the choice key. */
  kind: AttributionKind;
  /** Multi-line summary of the local edits, or 'Removed'. */
  mine: string;
  /** Multi-line summary of the server changes, or 'Removed'. */
  server: string;
  /** Server-assigned identity of the item. */
  uuid: string;
};

/**
 * The mine/server pair behind one conflict, kept for resolution. Exactly one
 * side is null when the disagreement is about the item's existence.
 */
export type AttributionConflictedRow<TItem extends AttributionItem> =
  /** Both sides edited the item. */
  | { kind: AttributionKind; mine: null; server: TItem; uuid: string }
  /** The server removed an item the form edited. */
  | { kind: AttributionKind; mine: TItem; server: null; uuid: string }
  /** The form removed an item the server edited. */
  | { kind: AttributionKind; mine: TItem; server: TItem; uuid: string };

export type AttributionRebaseResult<TItem extends AttributionItem> = {
  /** Server items added since page load that the local list does not have. */
  adoptedAdditions: TItem[];
  /** Uuids the server removed while the local list left the items alone. */
  adoptedRemovals: string[];
  /** Server items the form did not edit, including ones both sides changed to the same value. */
  adoptedUpdates: TItem[];
  /** The mine/server pairs behind the conflicts, for resolution. */
  conflictedRows: AttributionConflictedRow<TItem>[];
  /** Dialog-ready summaries, one per item changed on both sides. */
  conflicts: AttributionConflict[];
};

/** Conflicted rows split by the mine/server picks from the collision dialog. */
export type AttributionChoiceResult<TItem extends AttributionItem> = {
  /** Server copies that won their conflict. */
  adoptServer: TItem[];
  /** Uuids to drop because the server removal won. */
  drop: string[];
  /** Local items that won a changed-item conflict, stamped with the server token. */
  keepMine: TItem[];
  /** Uuids whose local removal won over a server edit. */
  keepRemoved: string[];
  /** Local items that won a removed-item conflict, ready to re-POST. */
  recreate: TItem[];
};

/** Row shape accepted by the CollisionConflictDialog conflicts prop. */
export type AttributionDialogRow = {
  id: string;
  label: string;
  mine: string;
  server: string;
};

function valuesEqual(left: unknown, right: unknown): boolean {
  return jsonEquals(left ?? null, right ?? null);
}

/** Compare two items on the config's fields, ignoring server-managed fields. */
export function itemsEqual<TItem, TField extends keyof TItem & string>(
  left: TItem,
  right: TItem,
  fields: readonly TField[],
): boolean {
  return fields.every(field => valuesEqual(left[field], right[field]));
}

/** Index a collection by uuid; with duplicates the first occurrence wins. */
function indexByUuid<TItem extends AttributionItem>(items: readonly TItem[]): Map<string, TItem> {
  const byUuid = new Map<string, TItem>();
  for (const item of items) {
    if (item.uuid && !byUuid.has(item.uuid)) byUuid.set(item.uuid, item);
  }
  return byUuid;
}

/** Dialog choice keys combine the kind and the item uuid. */
function attributionChoiceKey(kind: AttributionKind, uuid: string): string {
  return `${kind}:${uuid}`;
}

/** Editable fields per kind; the remaining schema fields are server-managed. */
const EDITABLE_FIELDS_BY_KIND: Record<AttributionKind, readonly string[]> = {
  acknowledgment: ACKNOWLEDGMENT_FIELDS,
  reference: REFERENCE_FIELDS,
};

/** The server item with the local values of the user-editable fields overlaid. */
function overlayEditableFields<TItem extends AttributionItem>(
  mine: TItem,
  server: TItem,
  kind: AttributionKind,
): TItem {
  const merged = { ...server } as Record<string, unknown>;
  for (const field of EDITABLE_FIELDS_BY_KIND[kind]) {
    merged[field] = (mine as Record<string, unknown>)[field];
  }
  return merged as TItem;
}

/**
 * Multi-line `Field: value` summary of the fields where `item` differs from `base`.
 * A null base lists every field.
 */
export function summarizeAttributionItem<TItem extends AttributionItem, TField extends keyof TItem & string>(
  base: null | TItem,
  item: TItem,
  config: AttributionConfig<TItem, TField>,
): string {
  return config.fields.flatMap((field) => {
    if (base && valuesEqual(base[field], item[field])) return [];
    return [`${config.fieldLabels[field]}: ${formatCollisionValue(item[field])}`];
  }).join('\n');
}

function itemConflict<TItem extends AttributionItem, TField extends keyof TItem & string>(
  config: AttributionConfig<TItem, TField>,
  loaded: null | TItem,
  mineItem: TItem,
  serverItem: null | TItem,
  uuid: string,
): AttributionConflict {
  return {
    kind: config.kind,
    mine: summarizeAttributionItem(loaded ?? serverItem, mineItem, config),
    itemLabel: config.itemLabel(mineItem),
    server: serverItem === null
      ? 'Removed'
      : summarizeAttributionItem(loaded ?? mineItem, serverItem, config),
    uuid,
  };
}

/** Conflict row for an item the form removed that the server edited. */
function deletedItemConflict<TItem extends AttributionItem, TField extends keyof TItem & string>(
  config: AttributionConfig<TItem, TField>,
  loaded: TItem,
  serverItem: TItem,
  uuid: string,
): AttributionConflict {
  return {
    kind: config.kind,
    mine: 'Removed',
    itemLabel: config.itemLabel(loaded),
    server: summarizeAttributionItem(loaded, serverItem, config),
    uuid,
  };
}

/**
 * Three-way compare of one attribution collection. `base` is the page-load
 * list, `mine` the current form list, `server` a fresh fetch. Items without a
 * uuid are local-new and are neither compared nor adopted. Conflicts are
 * whole-item: one per item, not per field.
 */
export function rebaseAttributionCollection<TItem extends AttributionItem, TField extends keyof TItem & string>(
  base: readonly TItem[],
  mine: readonly TItem[],
  server: readonly TItem[],
  config: AttributionConfig<TItem, TField>,
): AttributionRebaseResult<TItem> {
  const baseByUuid = indexByUuid(base);
  const mineByUuid = indexByUuid(mine);
  const serverByUuid = indexByUuid(server);
  const conflicts: AttributionConflict[] = [];
  const conflictedRows: AttributionConflictedRow<TItem>[] = [];
  const adoptedUpdates: TItem[] = [];
  const adoptedAdditions: TItem[] = [];
  const adoptedRemovals: string[] = [];

  for (const [uuid, mineItem] of mineByUuid) {
    const loaded = baseByUuid.get(uuid) ?? null;
    const current = serverByUuid.get(uuid) ?? null;
    // A uuid the page load never saw counts as fully locally changed.
    const mineChanged = loaded === null || !itemsEqual(loaded, mineItem, config.fields);

    if (current === null) {
      if (!mineChanged) {
        adoptedRemovals.push(uuid);
        continue;
      }
      conflicts.push(itemConflict(config, loaded, mineItem, null, uuid));
      conflictedRows.push({ kind: config.kind, mine: mineItem, server: null, uuid });
      continue;
    }

    const sameValue = itemsEqual(mineItem, current, config.fields);
    // Without a base copy the server counts as changed whenever it differs from the form.
    const serverChanged = loaded === null ? !sameValue : !itemsEqual(loaded, current, config.fields);

    if (mineChanged && serverChanged && !sameValue) {
      conflicts.push(itemConflict(config, loaded, mineItem, current, uuid));
      conflictedRows.push({ kind: config.kind, mine: mineItem, server: current, uuid });
    } else if (serverChanged) {
      // The form left the item alone or reached the same values; take the server copy.
      adoptedUpdates.push(current);
    }
    // Otherwise the only edits are local and stay in `mine` for the caller to save.
  }

  for (const [uuid, serverItem] of serverByUuid) {
    if (mineByUuid.has(uuid)) continue;
    const loaded = baseByUuid.get(uuid) ?? null;
    if (loaded === null) {
      // The page load never saw it: a server addition.
      adoptedAdditions.push(serverItem);
      continue;
    }
    // The form dropped the item. An unchanged server copy keeps the deletion
    // authoritative; a server edit is a both-side divergence the dialog settles.
    if (!itemsEqual(loaded, serverItem, config.fields)) {
      conflicts.push(deletedItemConflict(config, loaded, serverItem, uuid));
      conflictedRows.push({ kind: config.kind, mine: null, server: serverItem, uuid });
    }
  }

  return { adoptedAdditions, adoptedRemovals, adoptedUpdates, conflicts, conflictedRows };
}

/** Format rebase conflicts as rows for the collision dialog. */
export function attributionDialogRows(conflicts: readonly AttributionConflict[]): AttributionDialogRow[] {
  return conflicts.map(conflict => ({
    id: attributionChoiceKey(conflict.kind, conflict.uuid),
    label: `${KIND_LABELS[conflict.kind]} · ${conflict.itemLabel}`,
    mine: conflict.mine,
    server: conflict.server,
  }));
}

/**
 * Split conflicted rows by the dialog picks. A row without a pick keeps the
 * local side, mirroring the flaw field dialog.
 */
export function applyAttributionChoices<TItem extends AttributionItem>(
  conflictedRows: readonly AttributionConflictedRow<TItem>[],
  choices: Readonly<Record<string, CollisionChoice>>,
): AttributionChoiceResult<TItem> {
  const adoptServer: TItem[] = [];
  const drop: string[] = [];
  const keepMine: TItem[] = [];
  const keepRemoved: string[] = [];
  const recreate: TItem[] = [];

  for (const row of conflictedRows) {
    const choice = choices[attributionChoiceKey(row.kind, row.uuid)];
    if (row.server === null) {
      if (row.mine !== null) {
        // The server item is gone: the server side accepts the removal, the
        // local side re-POSTs the local item as new.
        if (choice === 'server') drop.push(row.uuid);
        else recreate.push({ ...row.mine, updated_dt: null, uuid: '' });
      }
      continue;
    }
    if (row.mine === null) {
      // The form removed the item: the server side resurrects the server
      // copy, the local side confirms the deletion.
      if (choice === 'server') adoptServer.push(row.server);
      else keepRemoved.push(row.uuid);
      continue;
    }
    if (choice === 'server') {
      adoptServer.push(row.server);
      continue;
    }
    // Keep the local edits on the server's copy: server-managed fields such as
    // embargoed keep the server's current value instead of a stale local one.
    keepMine.push(overlayEditableFields(row.mine, row.server, row.kind));
  }

  return { adoptServer, drop, keepMine, keepRemoved, recreate };
}
