import type { CollisionChoice } from '@/utils/flawRebase';

/** A stale CVSS token, or a create that matches an existing issuer and version. */
export function isCvssWriteConflict(error: unknown): boolean {
  const response = (error as { response?: { data?: unknown; status?: number } })?.response;
  if (response?.status === 409) return true;
  if (response?.status !== 400) return false;
  const text = typeof response.data === 'string' ? response.data : JSON.stringify(response.data ?? '');
  return /already exists|unique cvss/i.test(text);
}

/** Fields an analyst edits. The score is derived from the vector. */
export const CVSS_REBASE_FIELDS = ['comment', 'vector'] as const;

export type CvssRebaseField = typeof CVSS_REBASE_FIELDS[number];

export type CvssScoreSnapshot = {
  comment?: null | string;
  cvss_version?: null | string;
  issuer?: null | string;
  score?: null | number;
  updated_dt?: null | string;
  uuid?: null | string;
  vector?: null | string;
};

export type CvssFieldConflict = {
  field: 'removed' | CvssRebaseField;
  id: string;
  label: string;
  mine: string;
  server: string;
};

export type CvssRebaseResult = {
  conflicts: CvssFieldConflict[];
  formEdits: CvssRebaseField[];
  /** Local edits plus the server token. Null when the dialog has to choose. */
  merged: CvssScoreSnapshot | null;
  /** The analyst cleared a score the server did not change. */
  remove: boolean;
};

const FIELD_LABELS: Record<'removed' | CvssRebaseField, string> = {
  comment: 'Comment',
  removed: 'Removed',
  vector: 'Vector',
};

function blank(value: unknown): string {
  return value == null ? '' : String(value);
}

function same(left: unknown, right: unknown): boolean {
  return blank(left) === blank(right);
}

export function cvssScope(score: Pick<CvssScoreSnapshot, 'cvss_version' | 'issuer'>, owner: string): string {
  return `${owner}:${score.issuer ?? ''}:${score.cvss_version ?? ''}`;
}

export type CvssDiffPart = { changed: boolean; text: string };

function displayedCvss(value: string) {
  const at = value.indexOf('CVSS:');
  if (at < 0) return null;
  const [header, ...metrics] = value.slice(at).split('/');
  if (!header?.startsWith('CVSS:')) return null;
  const byKey = new Map<string, string>();
  const order: string[] = [];
  for (const metric of metrics) {
    const splitAt = metric.indexOf(':');
    if (splitAt <= 0) continue;
    const key = metric.slice(0, splitAt);
    byKey.set(key, metric);
    order.push(key);
  }
  return { byKey, header, order, prefix: value.slice(0, at) };
}

/** Mark the score and vector metrics that differ. Other conflict text stays plain. */
export function cvssDiffParts(value: string, other: string): CvssDiffPart[] {
  const left = displayedCvss(value);
  const right = displayedCvss(other);
  if (!left || !right) return [{ changed: Boolean(left || right) && value !== other, text: value }];

  const parts: CvssDiffPart[] = [];
  const prefix = left.prefix.trimEnd();
  const gap = left.prefix.slice(prefix.length);
  if (prefix) parts.push({ changed: prefix !== right.prefix.trimEnd(), text: prefix });
  if (gap) parts.push({ changed: false, text: gap });
  parts.push({ changed: left.header !== right.header, text: left.header });
  for (const key of left.order) {
    const metric = left.byKey.get(key);
    if (!metric) continue;
    parts.push({ changed: false, text: '/' });
    parts.push({ changed: metric !== right.byKey.get(key), text: metric });
  }
  return parts;
}

function show(field: 'removed' | CvssRebaseField, score: CvssScoreSnapshot | undefined): string {
  if (!score || field === 'removed') return 'Removed';
  if (field === 'comment') return score.comment || 'Empty';
  const parts = [score.score, score.vector].filter(part => part != null && part !== '');
  return parts.length ? parts.join(' ') : 'Empty';
}

/**
 * Three-way compare for one CVSS score.
 * `base` is the page-load score, `local` is the unsaved score, `server` is the fresh copy.
 */
export function rebaseCvssScore(
  base: CvssScoreSnapshot | undefined,
  local: CvssScoreSnapshot,
  server: CvssScoreSnapshot | undefined,
  label: string,
  scope: string,
): CvssRebaseResult {
  if (!server) {
    if (!local.uuid) return { conflicts: [], formEdits: [], merged: local, remove: false };
    return {
      conflicts: [{
        field: 'removed',
        id: `${scope}:removed`,
        label: `Removed · ${label}`,
        mine: show('vector', local),
        server: 'Removed',
      }],
      formEdits: [],
      merged: null,
      remove: false,
    };
  }

  const conflicts: CvssFieldConflict[] = [];
  const formEdits: CvssRebaseField[] = [];
  for (const field of CVSS_REBASE_FIELDS) {
    const loaded = base?.[field];
    const formValue = local[field];
    const serverValue = server[field];
    const formChanged = base ? !same(loaded, formValue) : !same(serverValue, formValue);
    const serverChanged = base ? !same(loaded, serverValue) : false;
    if (formChanged) formEdits.push(field);
    if (formChanged && (serverChanged || !base) && !same(formValue, serverValue)) {
      conflicts.push({
        field,
        id: `${scope}:${field}`,
        label: `${FIELD_LABELS[field]} · ${label}`,
        mine: show(field, local),
        server: show(field, server),
      });
    }
  }

  if (conflicts.length) return { conflicts, formEdits, merged: null, remove: false };

  const remove = Boolean(base?.vector) && !local.vector && same(base?.vector, server.vector);
  return {
    conflicts: [],
    formEdits,
    merged: {
      ...local,
      score: local.score,
      updated_dt: server.updated_dt ?? local.updated_dt,
      uuid: server.uuid ?? local.uuid,
    },
    remove,
  };
}

/** Apply dialog choices onto the local score and keep the server token. */
export function cvssFromChoices(
  local: CvssScoreSnapshot,
  server: CvssScoreSnapshot | undefined,
  formEdits: readonly CvssRebaseField[],
  choices: Readonly<Record<string, CollisionChoice>>,
  scope: string,
): CvssScoreSnapshot {
  if (choices[`${scope}:removed`] === 'mine') {
    return { ...local, updated_dt: null, uuid: null };
  }
  if (choices[`${scope}:removed`] === 'server' || !server) {
    return { ...local, score: null, updated_dt: server?.updated_dt ?? null, uuid: server?.uuid ?? null, vector: null };
  }

  const next: CvssScoreSnapshot = {
    ...local,
    updated_dt: server.updated_dt ?? local.updated_dt,
    uuid: server.uuid ?? local.uuid,
  };
  for (const field of formEdits) {
    if (choices[`${scope}:${field}`] !== 'server') continue;
    next[field] = server[field];
    if (field === 'vector') next.score = server.score;
  }
  return next;
}
