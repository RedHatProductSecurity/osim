import type { DeepReadonly } from 'vue';

import type { ZodFlawType } from '@/types';
import { jsonEquals } from '@/utils/helpers';

/**
 * Flaw fields a PUT can overwrite. The retry body starts from the server flaw
 * and copies the form value only for fields in this list that the form changed
 * since page load. The next slice normalizes dates, blank values, component
 * order, and aegis_meta keys; this pass uses plain equality.
 */
export const FLAW_REBASE_FIELDS = [
  'aegis_meta',
  'comment_zero',
  'components',
  'cve_description',
  'cve_id',
  'cwe_id',
  'embargoed',
  'impact',
  'major_incident_state',
  'mitigation',
  'nist_cvss_validation',
  'owner',
  'reported_dt',
  'source',
  'statement',
  'team_id',
  'title',
  'unembargo_dt',
] as const satisfies readonly (keyof ZodFlawType)[];

export type FlawRebaseField = typeof FLAW_REBASE_FIELDS[number];

const FLAW_REBASE_FIELD_LABELS: Record<FlawRebaseField, string> = {
  aegis_meta: 'Aegis metadata',
  comment_zero: 'Comment#0',
  components: 'Source Component',
  cve_description: 'Description',
  cve_id: 'CVE ID',
  cwe_id: 'CWE ID',
  embargoed: 'Embargoed',
  impact: 'Impact',
  major_incident_state: 'Incident State',
  mitigation: 'Mitigation',
  nist_cvss_validation: 'NIST CVSS validation',
  owner: 'Owner',
  reported_dt: 'Reported Date',
  source: 'Source',
  statement: 'Statement',
  team_id: 'Team',
  title: 'Title',
  unembargo_dt: 'Public Date',
};

export function flawRebaseFieldLabel(field: FlawRebaseField): string {
  return FLAW_REBASE_FIELD_LABELS[field];
}

export function formatCollisionValue(value: unknown): string {
  if (value == null || value === '') return 'Empty';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return 'Empty';
    return value.map(item => (
      typeof item === 'string' || typeof item === 'number' ? String(item) : JSON.stringify(item)
    )).join('\n');
  }
  return JSON.stringify(value, null, 2);
}

export type CollisionChoice = 'mine' | 'server';

export type FlawFieldConflict = {
  field: FlawRebaseField;
  mine: unknown;
  server: unknown;
};

export type FlawRebaseResult = {
  /** Server fields the form did not edit, copied onto the retry body. */
  adopted: FlawRebaseField[];
  /** Form fields the server also changed to a different value. */
  conflicts: FlawFieldConflict[];
  /** Fields the form changed since page load. */
  formEdits: FlawRebaseField[];
  /** Present when conflicts is empty. Safe to PUT. */
  merged: null | ZodFlawType;
};

function valuesEqual(left: unknown, right: unknown): boolean {
  return jsonEquals(left ?? null, right ?? null);
}

export function isFlawConflict(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('response' in error)) {
    return false;
  }
  const response = (error as { response?: { status?: number } }).response;
  return response?.status === 409;
}

/**
 * Build a retry body from the server flaw plus form edits that the server left alone.
 * `base` is the flaw from page load, `mine` is the body we just tried to save.
 */
export function rebaseDisjointFlaw(
  base: DeepReadonly<ZodFlawType>,
  mine: ZodFlawType,
  server: ZodFlawType,
): FlawRebaseResult {
  const adopted: FlawRebaseField[] = [];
  const conflicts: FlawFieldConflict[] = [];
  const formEdits: FlawRebaseField[] = [];

  for (const field of FLAW_REBASE_FIELDS) {
    const loaded = base[field];
    const formValue = mine[field];
    const serverValue = server[field];
    const formChanged = !valuesEqual(loaded, formValue);
    const serverChanged = !valuesEqual(loaded, serverValue);

    if (formChanged) {
      formEdits.push(field);
    }
    if (formChanged && serverChanged && !valuesEqual(formValue, serverValue)) {
      conflicts.push({ field, mine: formValue, server: serverValue });
    }
    if (!formChanged && serverChanged) {
      adopted.push(field);
    }
  }

  if (conflicts.length > 0) {
    return { adopted, conflicts, formEdits, merged: null };
  }

  // Child collections have their own tokens and are saved on other requests.
  const merged = withLocalCollections(server, mine);

  Object.assign(merged, Object.fromEntries(formEdits.map(field => [field, mine[field]])));

  return { adopted, conflicts, formEdits, merged };
}

function withLocalCollections(server: ZodFlawType, mine: ZodFlawType): ZodFlawType {
  return {
    ...server,
    acknowledgments: mine.acknowledgments,
    affects: mine.affects,
    comments: mine.comments,
    cvss_scores: mine.cvss_scores,
    labels: mine.labels,
    references: mine.references,
    updated_dt: server.updated_dt,
  };
}

/** Retry body after the user picks a side for each overlapping flaw field. */
export function flawBodyFromChoices(
  mine: ZodFlawType,
  server: ZodFlawType,
  formEdits: readonly FlawRebaseField[],
  choices: Readonly<Record<string, CollisionChoice>>,
): ZodFlawType {
  const merged = withLocalCollections(server, mine);

  Object.assign(merged, Object.fromEntries(
    formEdits
      .filter(field => choices[field] !== 'server')
      .map(field => [field, mine[field]]),
  ));

  return merged;
}
