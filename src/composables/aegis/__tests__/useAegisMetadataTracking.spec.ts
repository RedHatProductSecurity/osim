import { ref } from 'vue';

import { describe, it, expect, beforeEach, vi } from 'vitest';

import { useFlaw } from '@/composables/useFlaw';

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
      expect(tooltip).toBe('Generated by Aegis-AI-Bot<br><br>Short explanation');
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
      expect(tooltip).toBe(`Generated by Aegis-AI-Bot<br><br>${longExplanation}`);
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
      expect(tooltip).toBe('Generated by Aegis-AI-Bot<br><br>New explanation');
    });
  });
});
