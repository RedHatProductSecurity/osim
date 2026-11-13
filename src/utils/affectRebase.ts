import type { ZodAffectType } from '@/types';
import {
  formatCollisionValue,
  type CollisionChoice,
} from '@/utils/flawRebase';
import { jsonEquals } from '@/utils/helpers';

export type AffectConflictGroup = {
  detail?: string;
  id: string;
  label: string;
  mine: string;
  rows?: AffectConflictGroup[];
  server: string;
};

/**
 * Affect fields a bulk PUT can overwrite. cvss_scores and trackers have their own saves.
 * Equality is plain; an uncertain match is a conflict.
 */
export const AFFECT_REBASE_FIELDS = [
  'affectedness',
  'impact',
  'labels',
  'not_affected_justification',
  'ps_component',
  'ps_update_stream',
  'purl',
  'resolution',
  'subpackage_purls',
] as const satisfies readonly (keyof ZodAffectType)[];

export type AffectRebaseField = typeof AFFECT_REBASE_FIELDS[number];

const AFFECT_REBASE_FIELD_LABELS: Record<'deleted' | 'removed' | AffectRebaseField, string> = {
  affectedness: 'Affectedness',
  deleted: 'Deleted',
  impact: 'Impact',
  labels: 'Labels',
  not_affected_justification: 'Justification',
  ps_component: 'Component',
  ps_update_stream: 'Product stream',
  purl: 'PURL',
  removed: 'Removed',
  resolution: 'Resolution',
  subpackage_purls: 'Subpackage PURLs',
};

export type AffectFieldConflict = {
  affectLabel: string;
  affectUuid: string;
  detail: string;
  field: 'deleted' | 'removed' | AffectRebaseField;
  id: string;
  mine: unknown;
  server: unknown;
};

export type AffectConflictedRow = {
  formEdits: AffectRebaseField[];
  mine: ZodAffectType;
  server: ZodAffectType;
};

export type AffectRebaseResult = {
  /** Server copies of affects the user is deleting after the server edited them. */
  blockedDeletes: ZodAffectType[];
  conflicted: AffectConflictedRow[];
  conflicts: AffectFieldConflict[];
  /** Edited affects still on the server, with the server token and server-only field changes. */
  removed: ZodAffectType[];
  updates: ZodAffectType[];
};

function valuesEqual(left: unknown, right: unknown): boolean {
  return jsonEquals(left ?? null, right ?? null);
}

function readField(affect: ZodAffectType, field: AffectRebaseField): unknown {
  return affect[field];
}

function writeField(affect: ZodAffectType, field: AffectRebaseField, value: unknown) {
  (affect as Record<AffectRebaseField, unknown>)[field] = value;
}

export function affectConflictLabel(
  affect: Pick<ZodAffectType, 'ps_component' | 'ps_module' | 'ps_update_stream'>,
): string {
  const name = [affect.ps_update_stream, affect.ps_module, affect.ps_component].filter(Boolean).join(' · ');
  return name || 'Affect';
}

export function affectConflictDetail(affect: Pick<ZodAffectType, 'purl'>): string {
  return affect.purl ? `Analyzed component: ${affect.purl}` : '';
}

function isBlank(value: unknown): boolean {
  return value == null || value === '';
}

function createdFieldEqual(left: unknown, right: unknown): boolean {
  if (Array.isArray(left) || Array.isArray(right)) return valuesEqual(left ?? [], right ?? []);
  if (isBlank(left) && isBlank(right)) return true;
  return valuesEqual(left, right);
}

/** Fields where a new local affect differs from the server row that already has its stream and component. */
export function createdAffectConflicts(local: ZodAffectType, server: ZodAffectType): AffectFieldConflict[] {
  const affectUuid = server.uuid;
  if (!affectUuid) return [];
  const affectLabel = affectConflictLabel(server);
  const detail = affectConflictDetail(server);
  return AFFECT_REBASE_FIELDS.flatMap((field) => {
    const mine = readField(local, field);
    const theirs = readField(server, field);
    if (createdFieldEqual(mine, theirs)) return [];
    return [{ affectLabel, affectUuid, detail, field, id: `${affectUuid}:${field}`, mine, server: theirs }];
  });
}

/** Affects the user is deleting whose server fields changed since page load. */
export function deletionConflicts(
  base: readonly ZodAffectType[],
  deleting: readonly ZodAffectType[],
  server: readonly ZodAffectType[],
): { blocked: ZodAffectType[]; conflicts: AffectFieldConflict[] } {
  const baseByUuid = new Map(base.flatMap(affect => affect.uuid ? [[affect.uuid, affect] as const] : []));
  const serverByUuid = new Map(server.flatMap(affect => affect.uuid ? [[affect.uuid, affect] as const] : []));
  const blocked: ZodAffectType[] = [];
  const conflicts: AffectFieldConflict[] = [];

  for (const local of deleting) {
    const uuid = local.uuid;
    const current = uuid ? serverByUuid.get(uuid) : undefined;
    if (!uuid || !current) continue;

    const loaded = baseByUuid.get(uuid) ?? local;
    const changes = AFFECT_REBASE_FIELDS.flatMap((field) => {
      const serverValue = readField(current, field);
      if (createdFieldEqual(readField(loaded, field), serverValue)) return [];
      return [`${AFFECT_REBASE_FIELD_LABELS[field]}: ${formatCollisionValue(serverValue)}`];
    });
    if (!changes.length) continue;

    blocked.push(current);
    conflicts.push({
      affectLabel: affectConflictLabel(current),
      affectUuid: uuid,
      detail: affectConflictDetail(current),
      field: 'deleted',
      id: `${uuid}:deleted`,
      mine: 'Deleted',
      server: changes.join('\n'),
    });
  }

  return { blocked, conflicts };
}

function editedSummary(base: undefined | ZodAffectType, mine: ZodAffectType): string {
  const lines = AFFECT_REBASE_FIELDS.flatMap((field) => {
    if (base && valuesEqual(readField(base, field), readField(mine, field))) return [];
    return [`${AFFECT_REBASE_FIELD_LABELS[field]}: ${formatCollisionValue(readField(mine, field))}`];
  });
  return lines.join('\n') || 'Your edit';
}

function mergedAffect(
  mine: ZodAffectType,
  server: ZodAffectType,
  formEdits: readonly AffectRebaseField[],
  choices?: Readonly<Record<string, CollisionChoice>>,
): ZodAffectType {
  const next: ZodAffectType = { ...mine, updated_dt: server.updated_dt };
  for (const field of AFFECT_REBASE_FIELDS) {
    const edited = formEdits.includes(field);
    const takeServer = !edited || choices?.[`${server.uuid}:${field}`] === 'server';
    if (takeServer) writeField(next, field, readField(server, field));
  }
  return next;
}

/**
 * Three-way compare for affects the form edited.
 * `base` is the page-load list, `edited` is the unsaved rows, `server` is a fresh fetch.
 */
export function rebaseAffects(
  base: readonly ZodAffectType[],
  edited: readonly ZodAffectType[],
  server: readonly ZodAffectType[],
): AffectRebaseResult {
  const baseByUuid = new Map(base.flatMap(affect => affect.uuid ? [[affect.uuid, affect] as const] : []));
  const serverByUuid = new Map(server.flatMap(affect => affect.uuid ? [[affect.uuid, affect] as const] : []));
  const conflicts: AffectFieldConflict[] = [];
  const conflicted: AffectConflictedRow[] = [];
  const removed: ZodAffectType[] = [];
  const updates: ZodAffectType[] = [];

  for (const mine of edited) {
    const uuid = mine.uuid;
    if (!uuid) continue;

    const loaded = baseByUuid.get(uuid);
    const current = serverByUuid.get(uuid);
    const affectLabel = affectConflictLabel(mine);
    const detail = affectConflictDetail(mine);
    if (!current) {
      conflicts.push({
        affectLabel,
        affectUuid: uuid,
        detail,
        field: 'removed',
        id: `${uuid}:removed`,
        mine: editedSummary(loaded, mine),
        server: 'Removed',
      });
      removed.push(mine);
      continue;
    }

    const formEdits: AffectRebaseField[] = [];
    const rowConflicts: AffectFieldConflict[] = [];
    for (const field of AFFECT_REBASE_FIELDS) {
      const loadedValue = loaded ? readField(loaded, field) : undefined;
      const formValue = readField(mine, field);
      const serverValue = readField(current, field);
      const formChanged = loaded ? !valuesEqual(loadedValue, formValue) : !valuesEqual(serverValue, formValue);
      const serverChanged = loaded ? !valuesEqual(loadedValue, serverValue) : false;

      if (formChanged) formEdits.push(field);
      if (formChanged && (serverChanged || !loaded) && !valuesEqual(formValue, serverValue)) {
        rowConflicts.push({
          affectLabel,
          affectUuid: uuid,
          detail,
          field,
          id: `${uuid}:${field}`,
          mine: formValue,
          server: serverValue,
        });
      }
    }

    if (rowConflicts.length > 0) {
      conflicts.push(...rowConflicts);
      conflicted.push({ formEdits, mine, server: current });
    } else {
      updates.push(mergedAffect(mine, current, formEdits));
    }
  }

  return { blockedDeletes: [], conflicted, conflicts, removed, updates };
}

export function affectFromChoices(
  row: AffectConflictedRow,
  choices: Readonly<Record<string, CollisionChoice>>,
): ZodAffectType {
  return mergedAffect(row.mine, row.server, row.formEdits, choices);
}

function summarizeValues(values: unknown[]): string {
  const counts = new Map<string, number>();
  for (const value of values) {
    const formatted = formatCollisionValue(value);
    counts.set(formatted, (counts.get(formatted) ?? 0) + 1);
  }
  if (counts.size === 1) return [...counts.keys()][0];
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([value, count]) => `${value} (${count})`)
    .join('\n');
}

/** One dialog row per field. Several affects that differ on the same field collapse into a summary. */
export function groupAffectConflicts(conflicts: readonly AffectFieldConflict[]): AffectConflictGroup[] {
  const groups = new Map<AffectFieldConflict['field'], AffectFieldConflict[]>();
  for (const conflict of conflicts) {
    const group = groups.get(conflict.field) ?? [];
    group.push(conflict);
    groups.set(conflict.field, group);
  }

  return [...groups.entries()].map(([field, group]) => {
    const fieldLabel = AFFECT_REBASE_FIELD_LABELS[field];
    if (group.length === 1) {
      const [only] = group;
      return {
        detail: only.detail,
        id: only.id,
        label: `${fieldLabel} · ${only.affectLabel}`,
        mine: formatCollisionValue(only.mine),
        server: formatCollisionValue(only.server),
      };
    }

    return {
      id: `affect-field:${field}`,
      label: `${fieldLabel} · ${group.length} affects`,
      mine: summarizeValues(group.map(conflict => conflict.mine)),
      rows: group.map(conflict => ({
        detail: conflict.detail,
        id: conflict.id,
        label: conflict.affectLabel,
        mine: formatCollisionValue(conflict.mine),
        server: formatCollisionValue(conflict.server),
      })),
      server: summarizeValues(group.map(conflict => conflict.server)),
    };
  });
}
