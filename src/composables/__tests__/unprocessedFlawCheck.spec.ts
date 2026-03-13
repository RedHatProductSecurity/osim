import { describe, it, expect } from 'vitest';
import { DateTime } from 'luxon';

import { FlawClassificationStateEnum } from '@/generated-client';
import type { ZodFlawType } from '@/types';

import { useUnprocessedFlawDetection } from '../unprocessedFlawCheck';

describe('useUnprocessedFlawDetection', () => {
  const { isFlawUnprocessed } = useUnprocessedFlawDetection();

  it('returns true for unprocessed flaw (recent, within 24h)', () => {
    const flaw = {
      uuid: 'test-uuid',
      classification: { state: FlawClassificationStateEnum.New, workflow: 'test' },
      cve_id: 'CVE-2024-1234',
      created_dt: DateTime.now().minus({ hours: 1 }).toISO(),
      aegis_meta: null,
    } as ZodFlawType;

    expect(isFlawUnprocessed(flaw)).toBe(true);
  });

  it('returns false for non-NEW state', () => {
    const flaw = {
      uuid: 'test-uuid',
      classification: { state: FlawClassificationStateEnum.Done, workflow: 'test' },
      cve_id: 'CVE-2024-1234',
      created_dt: DateTime.now().minus({ hours: 1 }).toISO(),
      aegis_meta: null,
    } as ZodFlawType;

    expect(isFlawUnprocessed(flaw)).toBe(false);
  });

  it('returns false for invalid CVE ID', () => {
    const flaw = {
      uuid: 'test-uuid',
      classification: { state: FlawClassificationStateEnum.New, workflow: 'test' },
      cve_id: 'INVALID-CVE',
      created_dt: DateTime.now().minus({ hours: 1 }).toISO(),
      aegis_meta: null,
    } as ZodFlawType;

    expect(isFlawUnprocessed(flaw)).toBe(false);
  });

  it('returns false for missing CVE ID', () => {
    const flaw = {
      uuid: 'test-uuid',
      classification: { state: FlawClassificationStateEnum.New, workflow: 'test' },
      cve_id: null,
      created_dt: DateTime.now().minus({ hours: 1 }).toISO(),
      aegis_meta: null,
    } as ZodFlawType;

    expect(isFlawUnprocessed(flaw)).toBe(false);
  });

  it('returns false for old flaw (over 24h)', () => {
    const flaw = {
      uuid: 'test-uuid',
      classification: { state: FlawClassificationStateEnum.New, workflow: 'test' },
      cve_id: 'CVE-2024-1234',
      created_dt: DateTime.now().minus({ hours: 25 }).toISO(),
      aegis_meta: null,
    } as ZodFlawType;

    expect(isFlawUnprocessed(flaw)).toBe(false);
  });

  it('returns false for flaw with AI-Bot processing', () => {
    const flaw = {
      uuid: 'test-uuid',
      classification: { state: FlawClassificationStateEnum.New, workflow: 'test' },
      cve_id: 'CVE-2024-1234',
      created_dt: DateTime.now().minus({ hours: 1 }).toISO(),
      aegis_meta: {
        processed: true,
      },
    } as unknown as ZodFlawType;

    expect(isFlawUnprocessed(flaw)).toBe(false);
  });

  it('returns false for flaw with non-AI-Bot processing (has aegis_meta)', () => {
    const flaw = {
      uuid: 'test-uuid',
      classification: { state: FlawClassificationStateEnum.New, workflow: 'test' },
      cve_id: 'CVE-2024-1234',
      created_dt: DateTime.now().minus({ hours: 1 }).toISO(),
      aegis_meta: {
        processed: true,
      },
    } as unknown as ZodFlawType;

    expect(isFlawUnprocessed(flaw)).toBe(false);
  });

  it('returns false for flaw with non-empty affects', () => {
    const flaw = {
      uuid: 'test-uuid',
      classification: { state: FlawClassificationStateEnum.New, workflow: 'test' },
      cve_id: 'CVE-2024-1234',
      created_dt: DateTime.now().minus({ hours: 1 }).toISO(),
      aegis_meta: null,
      affects: [{ uuid: 'affect-1' }],
    } as ZodFlawType;

    expect(isFlawUnprocessed(flaw)).toBe(false);
  });

  it('returns false for flaw with non-empty owner', () => {
    const flaw = {
      uuid: 'test-uuid',
      classification: { state: FlawClassificationStateEnum.New, workflow: 'test' },
      cve_id: 'CVE-2024-1234',
      created_dt: DateTime.now().minus({ hours: 1 }).toISO(),
      aegis_meta: null,
      owner: 'test@example.com',
    } as ZodFlawType;

    expect(isFlawUnprocessed(flaw)).toBe(false);
  });

  it('returns false for flaw with non-empty cve_description', () => {
    const flaw = {
      uuid: 'test-uuid',
      classification: { state: FlawClassificationStateEnum.New, workflow: 'test' },
      cve_id: 'CVE-2024-1234',
      created_dt: DateTime.now().minus({ hours: 1 }).toISO(),
      aegis_meta: null,
      cve_description: 'This is a CVE description',
    } as ZodFlawType;

    expect(isFlawUnprocessed(flaw)).toBe(false);
  });

  it('returns false for flaw with non-empty statement', () => {
    const flaw = {
      uuid: 'test-uuid',
      classification: { state: FlawClassificationStateEnum.New, workflow: 'test' },
      cve_id: 'CVE-2024-1234',
      created_dt: DateTime.now().minus({ hours: 1 }).toISO(),
      aegis_meta: null,
      statement: 'This is a statement',
    } as ZodFlawType;

    expect(isFlawUnprocessed(flaw)).toBe(false);
  });

  it('returns false for flaw with non-empty mitigation', () => {
    const flaw = {
      uuid: 'test-uuid',
      classification: { state: FlawClassificationStateEnum.New, workflow: 'test' },
      cve_id: 'CVE-2024-1234',
      created_dt: DateTime.now().minus({ hours: 1 }).toISO(),
      aegis_meta: null,
      mitigation: 'This is a mitigation',
    } as ZodFlawType;

    expect(isFlawUnprocessed(flaw)).toBe(false);
  });

  it('returns false for flaw with non-empty cwe_id', () => {
    const flaw = {
      uuid: 'test-uuid',
      classification: { state: FlawClassificationStateEnum.New, workflow: 'test' },
      cve_id: 'CVE-2024-1234',
      created_dt: DateTime.now().minus({ hours: 1 }).toISO(),
      aegis_meta: null,
      cwe_id: 'CWE-79',
    } as ZodFlawType;

    expect(isFlawUnprocessed(flaw)).toBe(false);
  });

  it('returns false for flaw with RH cvss_scores', () => {
    const flaw = {
      uuid: 'test-uuid',
      classification: { state: FlawClassificationStateEnum.New, workflow: 'test' },
      cve_id: 'CVE-2024-1234',
      created_dt: DateTime.now().minus({ hours: 1 }).toISO(),
      aegis_meta: null,
      cvss_scores: [{ uuid: 'cvss-1', score: 7.5, issuer: 'RH' }],
    } as ZodFlawType;

    expect(isFlawUnprocessed(flaw)).toBe(false);
  });

  it('returns true for flaw with non-RH cvss_scores only', () => {
    const flaw = {
      uuid: 'test-uuid',
      classification: { state: FlawClassificationStateEnum.New, workflow: 'test' },
      cve_id: 'CVE-2024-1234',
      created_dt: DateTime.now().minus({ hours: 1 }).toISO(),
      aegis_meta: null,
      cvss_scores: [{ uuid: 'cvss-1', score: 7.5, issuer: 'CVEORG' }],
    } as ZodFlawType;

    expect(isFlawUnprocessed(flaw)).toBe(true);
  });
});
