import { ref } from 'vue';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { blankFlaw, useFlaw } from '@/composables/useFlaw';

import type { AegisChangeEntry, AegisMetadata } from '@/types/aegisAI';
import type { ImpactEnumWithBlankType } from '@/types/zodShared';
import { ZodAegisChangeTypeEnum } from '@/types/zodFlaw';

import { useAegisMetadataTracking } from '../useAegisMetadataTracking';
import { useAegisPendingSuggestion } from '../useAegisPendingSuggestion';

const tracking = useAegisMetadataTracking();
const pending: AegisChangeEntry = {
  type: 'AI-Bot-Pending',
  timestamp: '2026-11-20T10:00:00Z',
  value: 'LOW',
  explanation: 'External references indicate limited exploitability',
  confidence: 0.87,
  data_quality: 0.72,
  tools_used: ['external_references_tool', 'cve_tool'],
};

function usePendingField(
  fieldName: string,
  value: null | string | string[] | undefined,
) {
  const valueRef = ref<null | string | string[] | undefined>(value);
  return { ...useAegisPendingSuggestion(fieldName, valueRef), valueRef };
}

/**
 * Loads a flaw the way useFetchFlaw does: the tracking store is initialized
 * from the very object stored on the flaw, so both share the same arrays.
 */
function loadFlawWithMetadata(
  metadata: AegisMetadata,
  impact: ImpactEnumWithBlankType | null = 'CRITICAL',
) {
  const flawData = { ...blankFlaw(), impact, aegis_meta: metadata };
  useFlaw().setFlaw(flawData);
  tracking.setAegisMetadata(flawData.aegis_meta);
  return flawData;
}

beforeEach(() => {
  useFlaw().resetFlaw();
  tracking.setAegisMetadata({});
});

afterEach(() => {
  useFlaw().resetFlaw();
  tracking.setAegisMetadata({});
});

describe('useAegisPendingSuggestion pending detection', () => {
  it('accepts the AI-Bot-Pending change type without accepting arbitrary change types', () => {
    expect(ZodAegisChangeTypeEnum.parse(pending.type)).toBe('AI-Bot-Pending');
    expect(ZodAegisChangeTypeEnum.safeParse('AI-Bot-Pending-Unprocessed').success).toBe(false);
  });

  it('exposes the unprocessed trailing suggestion for its field', () => {
    tracking.setAegisMetadata({ impact: [structuredClone(pending)] });
    const { pendingEntry } = usePendingField('impact', 'CRITICAL');
    expect(pendingEntry.value).toEqual(pending);
  });

  it('ignores suggestions recorded for other fields', () => {
    tracking.setAegisMetadata({
      impact_other: [structuredClone(pending)],
      title: [structuredClone(pending)],
    });
    const { pendingEntry } = usePendingField('impact', 'CRITICAL');
    expect(pendingEntry.value).toBeNull();
  });

  it.each(['AI', 'Partial AI', 'AI-Bot', 'AI-Bot-Skipped'] as const)(
    'treats a trailing %s entry as processed',
    (type) => {
      tracking.setAegisMetadata({
        impact: [
          structuredClone(pending),
          { type, timestamp: '2026-11-20T11:00:00Z', value: 'LOW' },
        ],
      });
      const { pendingEntry } = usePendingField('impact', 'CRITICAL');
      expect(pendingEntry.value).toBeNull();
    },
  );

  it.each([undefined, null, {}])('finds no suggestion without recorded metadata (%p)', (metadata) => {
    tracking.setAegisMetadata(metadata as AegisMetadata | null | undefined);
    const { pendingEntry } = usePendingField('impact', 'CRITICAL');
    expect(pendingEntry.value).toBeNull();
  });

  it('hides the suggestion once the current value matches it', () => {
    tracking.setAegisMetadata({ impact: [structuredClone(pending)] });
    const { pendingEntry } = usePendingField('impact', 'LOW');
    expect(pendingEntry.value).toBeNull();
  });

  it('compares list suggestions by content', () => {
    const listPending = { ...structuredClone(pending), value: ['openssl', 'libxml2'] };
    tracking.setAegisMetadata({ components: [listPending] });

    expect(usePendingField('components', ['openssl', 'libxml2']).pendingEntry.value).toBeNull();
    expect(usePendingField('components', ['libxml2', 'openssl']).pendingEntry.value).toEqual(listPending);
    expect(usePendingField('components', []).pendingEntry.value).toEqual(listPending);
  });

  it('reactively clears the pending entry when the value becomes the suggestion', () => {
    tracking.setAegisMetadata({ impact: [structuredClone(pending)] });
    const { pendingEntry, valueRef } = usePendingField('impact', 'CRITICAL');
    expect(pendingEntry.value).toEqual(pending);

    valueRef.value = 'LOW';
    expect(pendingEntry.value).toBeNull();
  });
});

describe('useAegisPendingSuggestion accept', () => {
  it('applies the suggested value and records an AI-Bot entry superseding the pending one', () => {
    tracking.setAegisMetadata({ impact: [structuredClone(pending)] });
    const { accept, pendingEntry, valueRef } = usePendingField('impact', 'CRITICAL');
    const before = new Date().toISOString();
    accept();
    const after = new Date().toISOString();

    expect(valueRef.value).toBe('LOW');
    expect(pendingEntry.value).toBeNull();

    const entries = tracking.getAegisMetadata().impact;
    expect(entries).toHaveLength(2);
    expect(entries[0]).toEqual(pending);
    expect(entries[1]).toMatchObject({
      type: 'AI-Bot',
      value: 'LOW',
      explanation: pending.explanation,
      confidence: pending.confidence,
      data_quality: pending.data_quality,
      tools_used: pending.tools_used,
    });
    expect(new Date(entries[1].timestamp).getTime()).toBeGreaterThanOrEqual(new Date(before).getTime());
    expect(new Date(entries[1].timestamp).getTime()).toBeLessThanOrEqual(new Date(after).getTime());
  });

  it('records the accepted decision exactly once in the loaded flaw aegis_meta', () => {
    loadFlawWithMetadata({ impact: [structuredClone(pending)] });
    const { accept, valueRef } = usePendingField('impact', 'CRITICAL');
    accept();

    expect(valueRef.value).toBe('LOW');
    const expected = [pending, expect.objectContaining({ type: 'AI-Bot', value: 'LOW' })];
    expect(tracking.getAegisMetadata().impact).toEqual(expected);
    expect(useFlaw().flaw.value.aegis_meta?.impact).toEqual(expected);
    expect(useFlaw().isFlawUpdated.value).toBe(true);
  });

  it('keeps earlier field history when accepting and mirrors the decision on the loaded flaw', () => {
    const acceptedEarlier: AegisChangeEntry = {
      type: 'AI-Bot',
      timestamp: '2026-11-19T09:00:00Z',
      value: 'MODERATE',
    };
    loadFlawWithMetadata({ impact: [acceptedEarlier, structuredClone(pending)] });
    const { accept, valueRef } = usePendingField('impact', 'CRITICAL');
    accept();

    expect(valueRef.value).toBe('LOW');
    const expected = [
      acceptedEarlier,
      pending,
      expect.objectContaining({ type: 'AI-Bot', value: 'LOW' }),
    ];
    expect(tracking.getAegisMetadata().impact).toEqual(expected);
    expect(useFlaw().flaw.value.aegis_meta?.impact).toEqual(expected);
  });

  it('does nothing without a pending suggestion', () => {
    tracking.setAegisMetadata({
      impact: [{ type: 'AI-Bot', timestamp: '2026-11-19T09:00:00Z', value: 'LOW' }],
    });
    const { accept, pendingEntry, valueRef } = usePendingField('impact', 'CRITICAL');
    accept();

    expect(valueRef.value).toBe('CRITICAL');
    expect(pendingEntry.value).toBeNull();
    expect(tracking.getAegisMetadata().impact).toHaveLength(1);
  });

  it('records the accepted decision once even when the flaw metadata is decoupled from the tracking store', () => {
    // After a post-save resync the flaw owns a clone of the server metadata.
    const flawData = {
      ...blankFlaw(),
      impact: 'CRITICAL' as const,
      aegis_meta: { impact: [structuredClone(pending)] },
    };
    useFlaw().setFlaw(flawData);
    tracking.setAegisMetadata(structuredClone(flawData.aegis_meta));

    const { accept } = usePendingField('impact', 'CRITICAL');
    accept();

    const expected = [pending, expect.objectContaining({ type: 'AI-Bot', value: 'LOW' })];
    expect(tracking.getAegisMetadata().impact).toEqual(expected);
    expect(useFlaw().flaw.value.aegis_meta?.impact).toEqual(expected);
    expect(useFlaw().isFlawUpdated.value).toBe(true);
  });
});

describe('useAegisPendingSuggestion reject', () => {
  it('removes the pending entry and deletes the field key when nothing else is tracked', () => {
    tracking.setAegisMetadata({ impact: [structuredClone(pending)] });
    const { pendingEntry, reject, valueRef } = usePendingField('impact', 'CRITICAL');
    reject();

    expect(pendingEntry.value).toBeNull();
    expect(valueRef.value).toBe('CRITICAL');
    expect(tracking.getAegisMetadata().impact).toBeUndefined();
    expect(tracking.hasAegisChanges()).toBe(false);
  });

  it('preserves earlier field history when rejecting', () => {
    const accepted: AegisChangeEntry = {
      type: 'AI-Bot',
      timestamp: '2026-11-19T09:00:00Z',
      value: 'MODERATE',
    };
    tracking.setAegisMetadata({ impact: [accepted, structuredClone(pending)] });
    const { reject } = usePendingField('impact', 'CRITICAL');
    reject();

    expect(tracking.getAegisMetadata().impact).toEqual([accepted]);
  });

  it('leaves other fields and non-pending trailing entries untouched', () => {
    tracking.setAegisMetadata({
      impact: [{ type: 'AI', timestamp: '2026-11-19T09:00:00Z', value: 'LOW' }],
      title: [structuredClone(pending)],
    });
    const { reject } = usePendingField('impact', 'CRITICAL');
    reject();

    expect(tracking.getAegisMetadata().impact).toHaveLength(1);
    expect(tracking.getAegisMetadata().title).toEqual([pending]);
  });

  it('does nothing without a pending suggestion', () => {
    tracking.setAegisMetadata({
      impact: [{ type: 'AI', timestamp: '2026-11-19T09:00:00Z', value: 'LOW' }],
    });
    const { reject } = usePendingField('impact', 'CRITICAL');
    reject();

    expect(tracking.getAegisMetadata().impact).toHaveLength(1);
  });

  it('removes the pending entry from the loaded flaw aegis_meta so the decision is saved', () => {
    loadFlawWithMetadata({ impact: [structuredClone(pending)] });
    const { reject, valueRef } = usePendingField('impact', 'CRITICAL');
    reject();

    expect(valueRef.value).toBe('CRITICAL');
    expect(tracking.getAegisMetadata().impact).toBeUndefined();
    expect(useFlaw().flaw.value.aegis_meta?.impact).toEqual([]);
    expect(useFlaw().isFlawUpdated.value).toBe(true);
  });

  it('keeps earlier entries on the loaded flaw when rejecting', () => {
    const accepted: AegisChangeEntry = {
      type: 'AI-Bot',
      timestamp: '2026-11-19T09:00:00Z',
      value: 'MODERATE',
    };
    loadFlawWithMetadata({ impact: [accepted, structuredClone(pending)] });
    const { reject } = usePendingField('impact', 'CRITICAL');
    reject();

    expect(tracking.getAegisMetadata().impact).toEqual([accepted]);
    expect(useFlaw().flaw.value.aegis_meta?.impact).toEqual([accepted]);
    expect(useFlaw().isFlawUpdated.value).toBe(true);
  });
});
