import { ref } from 'vue';

import { describe, it, expect, beforeEach, vi } from 'vitest';

import { useFlaw } from '@/composables/useFlaw';

import type { AegisChangeEntry } from '@/types/aegisAI';
import { ZodAegisChangeTypeEnum } from '@/types/zodFlaw';

import { useAegisMetadataTracking } from '../useAegisMetadataTracking';

// Mock useFlaw
vi.mock('@/composables/useFlaw', () => ({
  useFlaw: vi.fn(),
}));

describe('useAegisMetadataTracking', () => {
  let tracking: ReturnType<typeof useAegisMetadataTracking>;

  beforeEach(() => {
    tracking = useAegisMetadataTracking();
    tracking.setAegisMetadata({});
  });

  describe('trackAIChange', () => {
    it('should track AI changes for fields', () => {
      tracking.trackAIChange('cwe_id', 'AI');

      const metadata = tracking.getAegisMetadata();
      expect(metadata.cwe_id).toHaveLength(1);
      expect(metadata.cwe_id[0].type).toBe('AI');
      expect(tracking.hasAegisChanges()).toBe(true);
    });

    it('should track partial AI changes', () => {
      tracking.trackAIChange('description', 'Partial AI');

      const metadata = tracking.getAegisMetadata();
      expect(metadata.description).toHaveLength(1);
      expect(metadata.description[0].type).toBe('Partial AI');
      expect(tracking.hasAegisChanges()).toBe(true);
    });

    it('should track AI-Bot changes', () => {
      tracking.trackAIChange('impact', 'AI-Bot');

      const metadata = tracking.getAegisMetadata();
      expect(metadata.impact).toHaveLength(1);
      expect(metadata.impact[0].type).toBe('AI-Bot');
      expect(tracking.hasAegisChanges()).toBe(true);
    });

    it('should track multiple changes to the same field', () => {
      tracking.trackAIChange('cwe_id', 'AI', 'CWE-123');
      tracking.trackAIChange('cwe_id', 'Partial AI', 'CWE-123 modified');

      const metadata = tracking.getAegisMetadata();
      expect(metadata.cwe_id).toHaveLength(2);
      expect(metadata.cwe_id[0].type).toBe('AI');
      expect(metadata.cwe_id[1].type).toBe('Partial AI');
    });

    it('should include timestamp and value in tracked changes', () => {
      const beforeTime = new Date().toISOString();
      tracking.trackAIChange('cwe_id', 'AI', 'CWE-123');
      const afterTime = new Date().toISOString();

      const metadata = tracking.getAegisMetadata();
      const change = metadata.cwe_id[0];
      expect(change.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(new Date(change.timestamp).getTime()).toBeGreaterThanOrEqual(new Date(beforeTime).getTime());
      expect(new Date(change.timestamp).getTime()).toBeLessThanOrEqual(new Date(afterTime).getTime());
      expect(change.value).toBe('CWE-123');
    });
  });

  describe('untrackAIChange', () => {
    it('should remove AI tracking for a field', () => {
      tracking.trackAIChange('cwe_id', 'AI');
      tracking.untrackAIChange('cwe_id');

      const metadata = tracking.getAegisMetadata();
      expect(metadata.cwe_id).toBeUndefined();
      expect(tracking.hasAegisChanges()).toBe(false);
    });
  });

  describe('getAegisMetadata', () => {
    it('should return all tracked metadata as arrays', () => {
      tracking.trackAIChange('cwe_id', 'AI');
      tracking.trackAIChange('description', 'Partial AI');

      const metadata = tracking.getAegisMetadata();
      expect(metadata.cwe_id).toHaveLength(1);
      expect(metadata.cwe_id[0].type).toBe('AI');
      expect(metadata.description).toHaveLength(1);
      expect(metadata.description[0].type).toBe('Partial AI');
    });

    it('should return empty object when no tracking', () => {
      const metadata = tracking.getAegisMetadata();
      expect(metadata).toEqual({});
    });
  });

  describe('setAegisMetadata', () => {
    it('should set metadata from external source (new format)', () => {
      const metadata = {
        cwe_id: [{ type: 'AI' as const, timestamp: '2024-01-01T00:00:00Z' }],
        description: [{ type: 'Partial AI' as const, timestamp: '2024-01-01T00:00:00Z' }],
      };
      tracking.setAegisMetadata(metadata);

      const newMetadata = tracking.getAegisMetadata();
      expect(newMetadata.cwe_id[0].type).toBe('AI');
      expect(newMetadata.description[0].type).toBe('Partial AI');
    });

    it('should handle null/undefined metadata', () => {
      tracking.trackAIChange('cwe_id', 'AI');
      tracking.setAegisMetadata(null);

      expect(tracking.hasAegisChanges()).toBe(false);

      tracking.setAegisMetadata(undefined);
      expect(tracking.hasAegisChanges()).toBe(false);
    });
  });

  describe('setAegisMetadata with empty object', () => {
    it('should clear all tracking when set to empty object', () => {
      tracking.trackAIChange('cwe_id', 'AI');
      tracking.trackAIChange('description', 'Partial AI');

      tracking.setAegisMetadata({});

      expect(tracking.hasAegisChanges()).toBe(false);
      expect(tracking.getAegisMetadata()).toEqual({});
    });
  });

  describe('isFieldValueAIBot', () => {
    beforeEach(() => {
      // Mock useFlaw to return a flaw in NEW state
      vi.mocked(useFlaw).mockReturnValue({
        flaw: ref({
          classification: { state: 'NEW' },
        }),
      } as any);
    });

    it('should return false when most recent matching entry is AI type (not AI-Bot)', () => {
      // Set up metadata where AI-Bot entry exists but AI entry is more recent
      tracking.setAegisMetadata({
        cwe_id: [
          {
            type: 'AI-Bot',
            timestamp: '2026-03-26T10:10:09.483331+00:00',
            value: 'CWE-639',
          },
          {
            type: 'AI',
            timestamp: '2026-03-26T10:53:57.174Z',
            value: 'CWE-639',
          },
        ],
      });

      const result = tracking.isFieldValueAIBot('cwe_id', 'CWE-639');
      expect(result).toBe(false);
    });

    it('should return true when most recent matching entry is AI-Bot type', () => {
      // Set up metadata where AI-Bot entry is the most recent
      tracking.setAegisMetadata({
        cwe_id: [
          {
            type: 'AI',
            timestamp: '2026-03-26T10:10:09.483331+00:00',
            value: 'CWE-639',
          },
          {
            type: 'AI-Bot',
            timestamp: '2026-03-26T10:53:57.174Z',
            value: 'CWE-639',
          },
        ],
      });

      const result = tracking.isFieldValueAIBot('cwe_id', 'CWE-639');
      expect(result).toBe(true);
    });

    it.each([
      ['NEW', 'NEW'],
      ['empty', ''],
      ['TRIAGE', 'TRIAGE'],
      ['PRE_SECONDARY_ASSESSMENT', 'PRE_SECONDARY_ASSESSMENT'],
      ['SECONDARY_ASSESSMENT', 'SECONDARY_ASSESSMENT'],
      ['DONE', 'DONE'],
      ['REJECTED', 'REJECTED'],
    ])('should highlight a matching AI-Bot value in %s state', (_label, state) => {
      vi.mocked(useFlaw).mockReturnValue({
        flaw: ref({
          classification: { state },
        }),
      } as any);

      tracking.setAegisMetadata({
        cwe_id: [
          {
            type: 'AI-Bot',
            timestamp: '2026-03-26T10:53:57.174Z',
            value: 'CWE-639',
            explanation: 'Suggested from CVE analysis',
          },
        ],
      });

      expect(tracking.isFieldValueAIBot('cwe_id', 'CWE-639')).toBe(true);
    });

    it('should return false when no matching entries exist', () => {
      tracking.setAegisMetadata({
        cwe_id: [
          {
            type: 'AI-Bot',
            timestamp: '2026-03-26T10:10:09.483331+00:00',
            value: 'CWE-123',
          },
        ],
      });

      const result = tracking.isFieldValueAIBot('cwe_id', 'CWE-639');
      expect(result).toBe(false);
    });
  });

  describe('ai-Bot skipped suggestions', () => {
    const skip: AegisChangeEntry = {
      type: 'AI-Bot-Skipped',
      timestamp: '2026-10-20T10:00:00Z',
      confidence: 0.6,
      data_quality: 0.6,
      tools_used: ['external_references_tool'],
      skip_reason: 'confidence',
      skip_description: 'impact suggestion discarded: confidence=0.6 is below threshold 0.6',
    };

    it('accepts the skipped change type without accepting arbitrary change types', () => {
      expect(ZodAegisChangeTypeEnum.parse(skip.type)).toBe('AI-Bot-Skipped');
      expect(ZodAegisChangeTypeEnum.safeParse('unknown').success).toBe(false);
    });

    it('shows the recorded description and optional metadata without claiming a suggestion was generated', () => {
      tracking.setAegisMetadata({ impact: [skip] });

      const tooltip = tracking.getAIBotSkipTooltip('impact');
      expect(tooltip).toContain('suggestion unavailable');
      expect(tooltip).toContain(`Reason: ${skip.skip_description}`);
      expect(tooltip).not.toContain('Reason: confidence\n');
      expect(tooltip).toContain('Confidence: 0.60');
      expect(tooltip).toContain('Data quality: 0.60');
      expect(tooltip).toContain('Tools used: external_references_tool');
      expect(tooltip).not.toContain('Generated by');
      expect(tooltip).not.toContain('Discarded suggestion:');
      expect(tracking.isFieldValueAIBot('impact', undefined)).toBe(false);
      expect(tracking.getAIBotEntry('impact')).toBeUndefined();
    });

    it.each([
      { field: 'impact', value: 'LOW', expected: 'LOW' },
      { field: 'title', value: '  Rejected title \t', expected: 'Rejected title' },
      {
        field: 'cve_description',
        value: '  First line\nSecond  line  ',
        expected: 'First line\nSecond  line',
      },
      { field: 'components', value: [' openssl ', '', ' \t ', 'libxml2'], expected: 'openssl, libxml2' },
    ])('shows the recorded $field proposal with its reason and metrics', ({ expected, field, value }) => {
      const entry = { ...skip, value };
      const recordedEntry = structuredClone(entry);
      tracking.setAegisMetadata({ [field]: [entry] });

      const tooltip = tracking.getAIBotSkipTooltip(field);
      expect(tooltip).toContain(`Discarded suggestion: ${expected}\n\n`);
      expect(tooltip).toContain(`Reason: ${skip.skip_description}`);
      expect(tooltip).toContain('Confidence: 0.60');
      expect(tooltip).toContain('Data quality: 0.60');
      expect(tooltip).toContain('Tools used: external_references_tool');
      expect(tooltip).not.toContain('Generated by');
      expect(tracking.getAegisMetadata()[field]).toEqual([recordedEntry]);
    });

    it.each<{ label: string; value: unknown }>([
      { label: 'missing value', value: undefined },
      { label: 'null', value: null },
      { label: 'empty string', value: '' },
      { label: 'whitespace-only string', value: ' \t\n ' },
      { label: 'empty array', value: [] },
      { label: 'empty component names', value: ['', ' \t\n '] },
      { label: 'zero', value: 0 },
      { label: 'nonzero number', value: 0.6 },
      { label: 'boolean', value: false },
      { label: 'object', value: { component: 'openssl' } },
      { label: 'invalid array members', value: [null, 42, false, {}] },
      { label: 'nested array', value: [['openssl']] },
    ])('omits the discarded suggestion line for $label while retaining the warning', ({ value }) => {
      // Older or malformed API records may not match the current TypeScript value type.
      tracking.setAegisMetadata({ components: [{ ...skip, value: value as AegisChangeEntry['value'] }] });

      const tooltip = tracking.getAIBotSkipTooltip('components');
      expect(tooltip).not.toContain('Discarded suggestion:');
      expect(tooltip).toContain('suggestion unavailable');
      expect(tooltip).toContain(`Reason: ${skip.skip_description}`);
      expect(tooltip).toContain('Confidence: 0.60');
      expect(tooltip).toContain('Tools used: external_references_tool');
    });

    it('shows valid component names without serializing invalid list members', () => {
      const value = [null, ' openssl ', 42, {}, ['nested-component'], false, 'libxml2'] as unknown as string[];
      const recordedValue = structuredClone(value);
      tracking.setAegisMetadata({ components: [{ ...skip, value }] });

      const tooltip = tracking.getAIBotSkipTooltip('components');
      expect(tooltip).toContain('Discarded suggestion: openssl, libxml2\n\n');
      expect(tooltip).not.toMatch(/null|42|\[object Object\]|nested-component|false/);
      expect(tracking.getAegisMetadata().components[0].value).toEqual(recordedValue);
    });

    it.each([
      { field: 'impact', value: 'LOW' },
      { field: 'components', value: ['openssl', 'libxml2'] },
    ])('does not classify a discarded $field value as an applied bot suggestion', ({ field, value }) => {
      const metadata = { [field]: [{ ...skip, value }] };
      const recordedMetadata = structuredClone(metadata);
      tracking.setAegisMetadata(metadata);

      expect(tracking.getAIBotSkipTooltip(field)).toContain('Discarded suggestion:');
      expect(tracking.isFieldValueAIBot(field, value)).toBe(false);
      expect(tracking.getAIBotEntry(field)).toBeUndefined();
      expect(tracking.hasAIBotProcessing(tracking.getAegisMetadata())).toBe(false);
      expect(tracking.getAegisMetadata()).toEqual(recordedMetadata);
    });

    it('keeps a previous accepted suggestion separate from the rejected proposal', () => {
      const accepted: AegisChangeEntry = {
        type: 'AI-Bot',
        timestamp: '2026-10-20T09:00:00Z',
        value: 'MODERATE',
        explanation: 'Previously accepted suggestion',
        confidence: 0.95,
      };
      tracking.setAegisMetadata({ impact: [accepted, { ...skip, value: 'LOW' }] });

      expect(tracking.getAIBotSkipTooltip('impact')).toContain('Discarded suggestion: LOW');
      expect(tracking.getAIBotEntry('impact')).toEqual(accepted);
      expect(tracking.isFieldValueAIBot('impact', 'MODERATE')).toBe(true);
      expect(tracking.isFieldValueAIBot('impact', 'LOW')).toBe(false);
      const acceptedTooltip = tracking.getAIBotTooltip('impact');
      expect(acceptedTooltip).toContain('Previously accepted suggestion');
      expect(acceptedTooltip).toContain('Confidence: 0.95');
      expect(acceptedTooltip).not.toMatch(/Discarded suggestion:|LOW|Confidence: 0.60/);
    });

    it.each([
      { field: 'impact', value: 'LOW' },
      { field: 'components', value: ['openssl', 'libxml2'] },
    ])('preserves accepted $field provenance when a later skipped proposal matches it', ({ field, value }) => {
      const accepted: AegisChangeEntry = {
        type: 'AI-Bot',
        timestamp: '2026-10-20T09:00:00Z',
        value,
        explanation: 'Previously accepted suggestion',
      };
      tracking.setAegisMetadata({ [field]: [accepted, { ...skip, value }] });

      expect(tracking.isFieldValueAIBot(field, value)).toBe(true);
      expect(tracking.getAIBotEntry(field)).toEqual(accepted);
      expect(tracking.getAIBotTooltip(field)).toContain('Previously accepted suggestion');
      expect(tracking.getAIBotSkipTooltip(field)).toContain('Discarded suggestion:');
      expect(tracking.getAIBotSkipTooltip(field)).toContain(`Reason: ${skip.skip_description}`);
    });

    it.each(['AI', 'Partial AI'] as const)('preserves a later %s change through another skipped attempt', (type) => {
      tracking.setAegisMetadata({ impact: [
        { type: 'AI-Bot', timestamp: '2026-10-20T09:00:00Z', value: 'LOW' },
        { ...skip, value: 'LOW' },
        { type, timestamp: '2026-10-20T11:00:00Z', value: 'LOW' },
        { ...skip, timestamp: '2026-10-20T12:00:00Z', value: 'LOW' },
      ] });

      expect(tracking.isFieldValueAIBot('impact', 'LOW')).toBe(false);
      expect(tracking.getAIBotSkipTooltip('impact')).toContain('Discarded suggestion: LOW');
    });

    it.each([undefined, null, '', ' \t\n '])('falls back to skip_reason for description %j', (description) => {
      tracking.setAegisMetadata({ impact: [{ ...skip, skip_description: description }] });
      expect(tracking.getAIBotSkipTooltip('impact')).toContain('Reason: confidence');
    });

    it.each([undefined, null, '', ' \t\n '])('shows generic unavailability when both reasons are %j', (reason) => {
      tracking.setAegisMetadata({ impact: [{
        type: skip.type,
        timestamp: skip.timestamp,
        skip_description: reason,
        skip_reason: reason,
      }] });
      const tooltip = tracking.getAIBotSkipTooltip('impact');
      expect(tooltip).toContain('suggestion unavailable');
      expect(tooltip).not.toMatch(/Reason:|Discarded suggestion:|undefined|null|Confidence:|Data quality:|Tools used:/);
    });

    it('shows a recorded proposal even when the skip reason and metrics are missing', () => {
      tracking.setAegisMetadata({ title: [{
        type: skip.type,
        timestamp: skip.timestamp,
        value: 'Rejected title',
      }] });

      const tooltip = tracking.getAIBotSkipTooltip('title');
      expect(tooltip).toContain('suggestion unavailable');
      expect(tooltip).toContain('Discarded suggestion: Rejected title');
      expect(tooltip).not.toMatch(/Reason:|Confidence:|Data quality:|Tools used:|Generated by/);
    });

    it('does not infer a skip from low metrics on a successful suggestion or another field', () => {
      tracking.setAegisMetadata({ impact: [{ ...skip, type: 'AI-Bot', value: 'LOW' }], title: [skip], cwe_id: [] });
      expect(tracking.getAIBotSkipTooltip('impact')).toBe('');
      expect(tracking.getAIBotSkipTooltip('cwe_id')).toBe('');
      expect(tracking.getAIBotSkipTooltip('missing')).toBe('');
      expect(tracking.getAIBotSkipTooltip('title')).toContain('suggestion unavailable');
    });

    it.each(['AI-Bot', 'AI', 'Partial AI'] as const)('lets a later %s entry supersede a skip', (type) => {
      tracking.setAegisMetadata({ impact: [
        { ...skip, value: 'IMPORTANT' },
        { type, timestamp: '2026-10-20T11:00:00Z', value: 'LOW' },
      ] });
      expect(tracking.getAIBotSkipTooltip('impact')).toBe('');
    });

    it('uses only the latest skip reason after a successful suggestion and an older skip', () => {
      tracking.setAegisMetadata({ impact: [
        { ...skip, value: 'IMPORTANT' },
        { type: 'AI-Bot', timestamp: '2026-10-20T11:00:00Z', value: 'LOW' },
        { type: skip.type, timestamp: '2026-10-20T12:00:00Z', skip_reason: 'no external references' },
      ] });
      const tooltip = tracking.getAIBotSkipTooltip('impact');
      expect(tooltip).toContain('Reason: no external references');
      expect(tooltip).not.toContain('threshold');
      expect(tooltip).not.toMatch(/Discarded suggestion:|IMPORTANT|LOW|Confidence:|Tools used:/);
    });

    it('uses only the most recent rejected proposal and its recorded metadata', () => {
      tracking.setAegisMetadata({ impact: [
        { ...skip, value: 'LOW' },
        {
          type: skip.type,
          timestamp: '2026-10-20T12:00:00Z',
          value: 'IMPORTANT',
          skip_reason: 'data_quality',
          skip_description: 'Latest recorded skip reason',
          confidence: 0.8,
          data_quality: 0.4,
          tools_used: ['cve_tool'],
        },
      ] });

      const tooltip = tracking.getAIBotSkipTooltip('impact');
      expect(tooltip).toContain('Discarded suggestion: IMPORTANT');
      expect(tooltip).toContain('Reason: Latest recorded skip reason');
      expect(tooltip).toContain('Confidence: 0.80');
      expect(tooltip).toContain('Data quality: 0.40');
      expect(tooltip).toContain('Tools used: cve_tool');
      expect(tooltip).not.toMatch(/LOW|threshold|0.60|external_references_tool/);
    });

    it('preserves zero metrics and omits invalid optional metadata', () => {
      tracking.setAegisMetadata({ impact: [{ ...skip, confidence: 0, data_quality: 2, tools_used: [] }] });
      const tooltip = tracking.getAIBotSkipTooltip('impact');
      expect(tooltip).toContain('Confidence: 0.00');
      expect(tooltip).not.toMatch(/Data quality:|Tools used:/);
    });

    it('clears historical warnings when metadata is reset or field tracking is removed', () => {
      tracking.setAegisMetadata({ impact: [skip] });
      tracking.untrackAIChange('impact');
      expect(tracking.getAIBotSkipTooltip('impact')).toBe('');
      tracking.setAegisMetadata({ impact: [skip] });
      tracking.setAegisMetadata(null);
      expect(tracking.getAIBotSkipTooltip('impact')).toBe('');
    });
  });

  describe('getAIBotTooltip', () => {
    it('should return basic tooltip when no explanation exists', () => {
      tracking.setAegisMetadata({
        title: [
          {
            type: 'AI-Bot',
            timestamp: '2024-01-01T00:00:00Z',
            value: 'Test Title',
          },
        ],
      });

      const tooltip = tracking.getAIBotTooltip('title');
      expect(tooltip).toBe('Generated by Aegis-AI-Bot');
    });

    it('should include explanation in tooltip', () => {
      tracking.setAegisMetadata({
        title: [
          {
            type: 'AI-Bot',
            timestamp: '2024-01-01T00:00:00Z',
            value: 'Test Title',
            explanation: 'Short explanation',
          },
        ],
      });

      const tooltip = tracking.getAIBotTooltip('title');
      expect(tooltip).toBe('Generated by Aegis-AI-Bot<br><br>Explanation: Short explanation');
    });

    it('should include full explanation without truncation', () => {
      const longExplanation = 'A'.repeat(250); // 250 characters
      tracking.setAegisMetadata({
        title: [
          {
            type: 'AI-Bot',
            timestamp: '2024-01-01T00:00:00Z',
            value: 'Test Title',
            explanation: longExplanation,
          },
        ],
      });

      const tooltip = tracking.getAIBotTooltip('title');
      expect(tooltip).toBe(`Generated by Aegis-AI-Bot<br><br>Explanation: ${longExplanation}`);
    });

    it('should use explanation from most recent AI-Bot entry', () => {
      tracking.setAegisMetadata({
        title: [
          {
            type: 'AI-Bot',
            timestamp: '2024-01-01T00:00:00Z',
            value: 'Old Title',
            explanation: 'Old explanation',
          },
          {
            type: 'AI-Bot',
            timestamp: '2024-01-01T01:00:00Z',
            value: 'New Title',
            explanation: 'New explanation',
          },
        ],
      });

      const tooltip = tracking.getAIBotTooltip('title');
      expect(tooltip).toBe('Generated by Aegis-AI-Bot<br><br>Explanation: New explanation');
    });

    it('should append optional suggestion metadata when present', () => {
      tracking.setAegisMetadata({
        title: [
          {
            type: 'AI-Bot',
            timestamp: '2024-01-01T00:00:00Z',
            value: 'Test Title',
            explanation: 'Short explanation',
            data_quality: 0.8,
            confidence: 0.95,
            tools_used: ['osidb_tool', 'cve_tool'],
          },
        ],
      });

      const tooltip = tracking.getAIBotTooltip('title');
      expect(tooltip).toBe(
        'Generated by Aegis-AI-Bot<br><br>Explanation: Short explanation\n\n'
        + 'Data quality: 0.80\nConfidence: 0.95\nTools used: osidb_tool, cve_tool',
      );
    });

    it('should show metadata without an explanation', () => {
      tracking.setAegisMetadata({
        impact: [
          {
            type: 'AI-Bot',
            timestamp: '2024-01-01T00:00:00Z',
            value: 'LOW',
            confidence: '0.5',
            tools_used: [],
          },
        ],
      });

      expect(tracking.getAIBotTooltip('impact')).toBe('Generated by Aegis-AI-Bot\n\nConfidence: 0.50');
    });

    it('should omit metadata outside 0..1 and non-string tools', () => {
      tracking.setAegisMetadata({
        cwe_id: [
          {
            type: 'AI-Bot',
            timestamp: '2024-01-01T00:00:00Z',
            value: 'CWE-79',
            data_quality: 1.2,
            confidence: -0.1,
            tools_used: ['', 'cwe_tool'],
          },
        ],
      });

      expect(tracking.getAIBotTooltip('cwe_id')).toBe('Generated by Aegis-AI-Bot\n\nTools used: cwe_tool');
    });

    it('should omit whitespace-only scores and tool names', () => {
      tracking.setAegisMetadata({
        title: [
          {
            type: 'AI-Bot',
            timestamp: '2024-01-01T00:00:00Z',
            value: 'Test Title',
            data_quality: ' ',
            confidence: '  0.40  ',
            tools_used: [' ', '  cve_tool  ', ''],
          },
        ],
      });

      expect(tracking.getAIBotTooltip('title')).toBe(
        'Generated by Aegis-AI-Bot\n\nConfidence: 0.40\nTools used: cve_tool',
      );
    });
  });
});
