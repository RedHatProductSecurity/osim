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
  /** Multi-line summary of the local edits. */
  mine: string;
  /** Multi-line summary of the server changes, or 'Removed'. */
  server: string;
  /** Server-assigned identity of the item. */
  uuid: string;
};

/** The mine/server pair behind one conflict, kept for resolution. */
export type AttributionConflictedRow<TItem extends AttributionItem> = {
  kind: AttributionKind;
  /** Local copy of the item. */
  mine: TItem;
  /** Server copy; null when the server removed the item. */
  server: null | TItem;
  /** Server-assigned identity of the item. */
  uuid: string;
};

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
    // Items the form dropped stay deleted; adopt only server additions.
    if (mineByUuid.has(uuid) || baseByUuid.has(uuid)) continue;
    adoptedAdditions.push(serverItem);
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
 * local item, mirroring the flaw field dialog.
 */
export function applyAttributionChoices<TItem extends AttributionItem>(
  conflictedRows: readonly AttributionConflictedRow<TItem>[],
  choices: Readonly<Record<string, CollisionChoice>>,
): AttributionChoiceResult<TItem> {
  const adoptServer: TItem[] = [];
  const drop: string[] = [];
  const keepMine: TItem[] = [];
  const recreate: TItem[] = [];

  for (const row of conflictedRows) {
    if (choices[attributionChoiceKey(row.kind, row.uuid)] === 'server') {
      if (row.server === null) {
        drop.push(row.uuid);
        continue;
      }
      adoptServer.push(row.server);
      continue;
    }

    if (row.server === null) {
      // The server item is gone; re-POST the local item as new.
      recreate.push({ ...row.mine, updated_dt: null, uuid: '' });
      continue;
    }
    // Keep the local edits on the server's copy: server-managed fields such as
    // embargoed keep the server's current value instead of a stale local one.
    keepMine.push(overlayEditableFields(row.mine, row.server, row.kind));
  }

  return { adoptServer, drop, keepMine, recreate };
}
