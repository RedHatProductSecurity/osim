import { describe, it, expect, beforeEach } from 'vitest';

import { useAegisMetadataTracking, determineChangeType } from '../useAegisMetadataTracking';

describe('useAegisMetadataTracking', () => {
  let tracking: ReturnType<typeof useAegisMetadataTracking>;

  beforeEach(() => {
    tracking = useAegisMetadataTracking();
    tracking.clearAegisMetadata();
  });

  describe('trackAIChange', () => {
    it('should track AI changes for fields', () => {
      tracking.trackAIChange('cwe_id', 'AI');

      expect(tracking.getAIChangeType('cwe_id')).toBe('AI');
      expect(tracking.hasAegisChanges()).toBe(true);
    });

    it('should track partial AI changes', () => {
      tracking.trackAIChange('description', 'Partial AI');

      expect(tracking.getAIChangeType('description')).toBe('Partial AI');
      expect(tracking.hasAegisChanges()).toBe(true);
    });

    it('should track multiple changes to the same field', () => {
      tracking.trackAIChange('cwe_id', 'AI', 'CWE-123');
      tracking.trackAIChange('cwe_id', 'Partial AI', 'CWE-123 modified');

      expect(tracking.getAIChangeType('cwe_id')).toBe('Partial AI');
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

      expect(tracking.getAIChangeType('cwe_id')).toBeUndefined();
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

      expect(tracking.getAIChangeType('cwe_id')).toBe('AI');
      expect(tracking.getAIChangeType('description')).toBe('Partial AI');
    });

    it('should handle null/undefined metadata', () => {
      tracking.trackAIChange('cwe_id', 'AI');
      tracking.setAegisMetadata(null);

      expect(tracking.hasAegisChanges()).toBe(false);

      tracking.setAegisMetadata(undefined);
      expect(tracking.hasAegisChanges()).toBe(false);
    });
  });

  describe('clearAegisMetadata', () => {
    it('should clear all tracking', () => {
      tracking.trackAIChange('cwe_id', 'AI');
      tracking.trackAIChange('description', 'Partial AI');

      tracking.clearAegisMetadata();

      expect(tracking.hasAegisChanges()).toBe(false);
      expect(tracking.getAegisMetadata()).toEqual({});
    });
  });
});

describe('determineChangeType', () => {
  it('should return "AI" for exact matches', () => {
    const result = determineChangeType('CWE-123', 'CWE-123');
    expect(result).toBe('AI');
  });

  it('should return "Partial AI" when current value contains suggestion', () => {
    const result = determineChangeType('CWE-123', 'CWE-123 (with additional context)');
    expect(result).toBe('Partial AI');
  });

  it('should return "Partial AI" when values are completely different', () => {
    const result = determineChangeType('CWE-123', 'CWE-456');
    expect(result).toBe('Partial AI');
  });

  it('should return null for empty values', () => {
    expect(determineChangeType('', 'CWE-123')).toBeNull();
    expect(determineChangeType('CWE-123', '')).toBeNull();
    expect(determineChangeType('', '')).toBeNull();
  });
});
