import type { ZodAffectType } from '@/types';
import {
  formatCollisionValue,
  valuesEqual,
  type CollisionChoice,
} from '@/utils/flawRebase';

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

/**
 * Affectedness, resolution, and justification are one choice. The table clears
 * resolution when affectedness changes, so merging them separately can save a
 * pair neither session chose, such as NEW with OOSS.
 */
const AFFECT_STATE_FIELDS = [
  'affectedness',
  'not_affected_justification',
  'resolution',
] as const satisfies readonly AffectRebaseField[];

type AffectStateField = typeof AFFECT_STATE_FIELDS[number];

const AFFECT_REBASE_FIELD_LABELS: Record<'deleted' | 'identity' | 'removed' | 'state' | AffectRebaseField, string> = {
  affectedness: 'Affectedness',
  deleted: 'Deleted',
  identity: 'Component',
  impact: 'Impact',
  labels: 'Labels',
  not_affected_justification: 'Justification',
  ps_component: 'Component',
  ps_update_stream: 'Product stream',
  purl: 'PURL',
  removed: 'Removed',
  resolution: 'Resolution',
  state: 'Affectedness',
  subpackage_purls: 'Subpackage PURLs',
};

export type AffectFieldConflict = {
  affectLabel: string;
  affectUuid: string;
  detail: string;
  field: 'deleted' | 'identity' | 'removed' | 'state' | AffectRebaseField;
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
  /** Server rows for `updates`. The baseline advances to these, not the merged rows. */
  updateServers: ZodAffectType[];
};

function readField(affect: ZodAffectType, field: AffectRebaseField): unknown {
  return affect[field];
}

function writeField(affect: ZodAffectType, field: AffectRebaseField, value: unknown) {
  (affect as Record<AffectRebaseField, unknown>)[field] = value;
}

function indexByUuid(affects: readonly ZodAffectType[]): Map<string, ZodAffectType> {
  return new Map(affects.flatMap(affect => affect.uuid ? [[affect.uuid, affect] as const] : []));
}

function affectFieldConflict(
  source: Pick<ZodAffectType, 'ps_component' | 'ps_module' | 'ps_update_stream' | 'purl'>,
  affectUuid: string,
  field: AffectFieldConflict['field'],
  mine: unknown,
  server: unknown,
): AffectFieldConflict {
  return {
    affectLabel: affectConflictLabel(source),
    affectUuid,
    detail: affectConflictDetail(source),
    field,
    id: `${affectUuid}:${field}`,
    mine,
    server,
  };
}

function stateFieldConflict(
  source: Pick<ZodAffectType, 'ps_component' | 'ps_module' | 'ps_update_stream' | 'purl'>,
  affectUuid: string,
  local: ZodAffectType,
  server: ZodAffectType,
): AffectFieldConflict {
  return affectFieldConflict(source, affectUuid, 'state', affectStateText(local), affectStateText(server));
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

function isStateField(field: AffectRebaseField): field is AffectStateField {
  return (AFFECT_STATE_FIELDS as readonly AffectRebaseField[]).includes(field);
}

/**
 * A PURL wins over the component on write. Show both so one choice keeps a matching pair.
 * A component alone is the value that will be saved.
 */
function affectIdentityText(affect: Pick<ZodAffectType, 'ps_component' | 'purl'>): string {
  const component = affect.ps_component || 'Empty';
  return affect.purl ? `${component} · ${affect.purl}` : component;
}

/** A PURL on one side would blank a component edit from the other, so the fields are one choice. */
function identityOverridden(loaded: ZodAffectType, mine: ZodAffectType, server: ZodAffectType): boolean {
  const componentEdited = !valuesEqual(loaded.ps_component, mine.ps_component);
  const serverComponentEdited = !valuesEqual(loaded.ps_component, server.ps_component);
  const purlEdited = !valuesEqual(loaded.purl, mine.purl);
  const serverPurlBlanksComponent = componentEdited
    && Boolean(server.purl)
    && !valuesEqual(mine.purl, server.purl);
  const localPurlBlanksComponent = purlEdited
    && Boolean(mine.purl)
    && serverComponentEdited
    && !valuesEqual(mine.ps_component, server.ps_component);
  return serverPurlBlanksComponent || localPurlBlanksComponent;
}

/** How an analyst reads the coupled fields, for example AFFECTED:OOSS. */
export function affectStateText(affect: Pick<ZodAffectType, AffectStateField>): string {
  const affectedness = String(affect.affectedness || 'Empty');
  if (affectedness === 'NOTAFFECTED' && affect.not_affected_justification) {
    return `${affectedness}:${affect.not_affected_justification}`;
  }
  if (affect.resolution) return `${affectedness}:${affect.resolution}`;
  return affectedness;
}

function stateDiffers(
  left: ZodAffectType,
  right: ZodAffectType,
  equal: (leftValue: unknown, rightValue: unknown) => boolean,
): boolean {
  return AFFECT_STATE_FIELDS.some(field => !equal(readField(left, field), readField(right, field)));
}

/** A stale affect token. Older saves use 409. Bulk saves report the same fact as 400. */
export function isStaleAffectWrite(error: unknown): boolean {
  const response = (error as { response?: { data?: unknown; status?: number } })?.response;
  if (response?.status === 409) return true;
  const text = typeof response?.data === 'string' ? response.data : JSON.stringify(response?.data ?? '');
  return /updated_dt/i.test(text) && /changed since it was retrieved/i.test(text);
}

/** Fields where a new local affect differs from the server row that already has its stream and component. */
export function createdAffectConflicts(local: ZodAffectType, server: ZodAffectType): AffectFieldConflict[] {
  const affectUuid = server.uuid;
  if (!affectUuid) return [];
  const fieldConflicts = AFFECT_REBASE_FIELDS.flatMap((field) => {
    if (isStateField(field)) return [];
    const mine = readField(local, field);
    const theirs = readField(server, field);
    if (createdFieldEqual(mine, theirs)) return [];
    // A blank component is what the create sends. OSIDB fills it in from the PURL.
    if (field === 'ps_component' && local.purl && local.purl === server.purl && isBlank(mine)) return [];
    return [affectFieldConflict(server, affectUuid, field, mine, theirs)];
  });
  if (!stateDiffers(local, server, createdFieldEqual)) return fieldConflicts;
  return [...fieldConflicts, stateFieldConflict(server, affectUuid, local, server)];
}

/** Dialog fields for a duplicate create. The state choice is stored as the fields it covers. */
export function createdFormEdits(
  local: ZodAffectType,
  server: ZodAffectType,
  conflicts: readonly AffectFieldConflict[],
): AffectRebaseField[] {
  const edits: AffectRebaseField[] = [];
  for (const conflict of conflicts) {
    if (conflict.field === 'state') {
      for (const field of AFFECT_STATE_FIELDS) {
        if (!createdFieldEqual(readField(local, field), readField(server, field))) edits.push(field);
      }
      continue;
    }
    if (conflict.field === 'deleted' || conflict.field === 'identity' || conflict.field === 'removed') continue;
    edits.push(conflict.field);
  }
  return edits;
}

/** Affects the user is deleting whose server fields changed since page load. */
export function deletionConflicts(
  base: readonly ZodAffectType[],
  deleting: readonly ZodAffectType[],
  server: readonly ZodAffectType[],
): { blocked: ZodAffectType[]; conflicts: AffectFieldConflict[] } {
  const baseByUuid = indexByUuid(base);
  const serverByUuid = indexByUuid(server);
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
    conflicts.push(affectFieldConflict(current, uuid, 'deleted', 'Deleted', changes.join('\n')));
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
  const stateChoice = server.uuid ? choices?.[`${server.uuid}:state`] : undefined;
  const identityChoice = server.uuid ? choices?.[`${server.uuid}:identity`] : undefined;
  const editedState = AFFECT_STATE_FIELDS.some(field => formEdits.includes(field));
  for (const field of AFFECT_REBASE_FIELDS) {
    if (isStateField(field)) {
      const takeServerState = stateChoice === 'server' || (stateChoice !== 'mine' && !editedState);
      if (takeServerState) writeField(next, field, readField(server, field));
      continue;
    }
    const edited = formEdits.includes(field);
    const takeServer = !edited || choices?.[`${server.uuid}:${field}`] === 'server';
    if (takeServer) writeField(next, field, readField(server, field));
  }
  if (identityChoice) {
    const source = identityChoice === 'server' ? server : mine;
    next.ps_component = source.ps_component;
    next.purl = source.purl;
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
  const baseByUuid = indexByUuid(base);
  const serverByUuid = indexByUuid(server);
  const conflicts: AffectFieldConflict[] = [];
  const conflicted: AffectConflictedRow[] = [];
  const removed: ZodAffectType[] = [];
  const updateServers: ZodAffectType[] = [];
  const updates: ZodAffectType[] = [];

  for (const mine of edited) {
    const uuid = mine.uuid;
    if (!uuid) continue;

    const loaded = baseByUuid.get(uuid);
    const current = serverByUuid.get(uuid);
    if (!current) {
      conflicts.push(affectFieldConflict(mine, uuid, 'removed', editedSummary(loaded, mine), 'Removed'));
      removed.push(mine);
      continue;
    }

    const formEdits: AffectRebaseField[] = [];
    const rowConflicts: AffectFieldConflict[] = [];
    let stateFormChanged = false;
    let stateServerChanged = false;
    const coupled = loaded ? identityOverridden(loaded, mine, current) : false;
    for (const field of AFFECT_REBASE_FIELDS) {
      const loadedValue = loaded ? readField(loaded, field) : undefined;
      const formValue = readField(mine, field);
      const serverValue = readField(current, field);
      const formChanged = loaded ? !valuesEqual(loadedValue, formValue) : !valuesEqual(serverValue, formValue);
      const serverChanged = loaded ? !valuesEqual(loadedValue, serverValue) : false;

      if (isStateField(field)) {
        if (formChanged) {
          formEdits.push(field);
          stateFormChanged = true;
        }
        if (serverChanged) stateServerChanged = true;
        continue;
      }
      if (formChanged) formEdits.push(field);
      const coupledField = coupled && (field === 'ps_component' || field === 'purl');
      if (!coupledField && formChanged && (serverChanged || !loaded) && !valuesEqual(formValue, serverValue)) {
        rowConflicts.push(affectFieldConflict(mine, uuid, field, formValue, serverValue));
      }
    }
    if (coupled && affectIdentityText(mine) !== affectIdentityText(current)) {
      rowConflicts.push(affectFieldConflict(
        mine,
        uuid,
        'identity',
        affectIdentityText(mine),
        affectIdentityText(current),
      ));
    }
    if (stateFormChanged && (stateServerChanged || !loaded) && stateDiffers(mine, current, valuesEqual)) {
      rowConflicts.push(stateFieldConflict(mine, uuid, mine, current));
    }

    if (rowConflicts.length > 0) {
      conflicts.push(...rowConflicts);
      conflicted.push({ formEdits, mine, server: current });
    } else {
      updates.push(mergedAffect(mine, current, formEdits));
      updateServers.push(current);
    }
  }

  return { blockedDeletes: [], conflicted, conflicts, removed, updateServers, updates };
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
