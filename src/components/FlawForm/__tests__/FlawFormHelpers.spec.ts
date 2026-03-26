import { describe, it, expect, beforeEach } from 'vitest';

import { useAegisMetadataTracking } from '@/composables/aegis/useAegisMetadataTracking';

describe('flawForm helper functions', () => {
  const { isFieldValueAIBot, setAegisMetadata } = useAegisMetadataTracking();

  beforeEach(() => {
    // Clear metadata before each test
    setAegisMetadata({});
  });

  describe('isArrayFieldValueAIBot equivalent logic', () => {
    it('should return true when array field value matches AI-Bot metadata', () => {
      // Set up metadata for components field
      setAegisMetadata({
        components: [
          {
            type: 'AI-Bot',
            timestamp: '2024-01-01T00:00:00Z',
            value: JSON.stringify(['kernel', 'openssl']),
          },
        ],
      });

      const currentValue = ['kernel', 'openssl'];
      const serializedValue = JSON.stringify(currentValue);

      expect(isFieldValueAIBot('components', serializedValue)).toBe(true);
    });

    it('should return false when array field value does not match AI-Bot metadata', () => {
      // Set up metadata for components field with different value
      setAegisMetadata({
        components: [
          {
            type: 'AI-Bot',
            timestamp: '2024-01-01T00:00:00Z',
            value: JSON.stringify(['httpd', 'mod_ssl']),
          },
        ],
      });

      const currentValue = ['kernel', 'openssl'];
      const serializedValue = JSON.stringify(currentValue);

      expect(isFieldValueAIBot('components', serializedValue)).toBe(false);
    });

    it('should return false when field has no metadata', () => {
      // No metadata set
      setAegisMetadata({});

      const currentValue = ['kernel', 'openssl'];
      const serializedValue = JSON.stringify(currentValue);

      expect(isFieldValueAIBot('components', serializedValue)).toBe(false);
    });

    it('should return false when field has AI type metadata (only AI-Bot should highlight)', () => {
      // Set up metadata with AI type - should NOT trigger highlighting
      setAegisMetadata({
        components: [
          {
            type: 'AI',
            timestamp: '2024-01-01T00:00:00Z',
            value: JSON.stringify(['kernel', 'openssl']),
          },
        ],
      });

      const currentValue = ['kernel', 'openssl'];
      const serializedValue = JSON.stringify(currentValue);

      expect(isFieldValueAIBot('components', serializedValue)).toBe(false);
    });

    it('should return true when multiple metadata entries exist and one AI-Bot entry matches', () => {
      // Set up metadata with multiple entries
      setAegisMetadata({
        components: [
          {
            type: 'AI-Bot',
            timestamp: '2024-01-01T00:00:00Z',
            value: JSON.stringify(['httpd']),
          },
          {
            type: 'AI-Bot',
            timestamp: '2024-01-01T01:00:00Z',
            value: JSON.stringify(['kernel', 'openssl']), // This matches
          },
          {
            type: 'AI-Bot',
            timestamp: '2024-01-01T02:00:00Z',
            value: JSON.stringify(['glibc']),
          },
        ],
      });

      const currentValue = ['kernel', 'openssl'];
      const serializedValue = JSON.stringify(currentValue);

      expect(isFieldValueAIBot('components', serializedValue)).toBe(true);
    });

    it('should handle array order sensitivity correctly', () => {
      // Set up metadata with specific order
      setAegisMetadata({
        components: [
          {
            type: 'AI-Bot',
            timestamp: '2024-01-01T00:00:00Z',
            value: JSON.stringify(['kernel', 'openssl']),
          },
        ],
      });

      // Test with same order - should match
      const sameOrder = ['kernel', 'openssl'];
      expect(isFieldValueAIBot('components', JSON.stringify(sameOrder))).toBe(true);

      // Test with different order - should not match (JSON.stringify is order-sensitive)
      const differentOrder = ['openssl', 'kernel'];
      expect(isFieldValueAIBot('components', JSON.stringify(differentOrder))).toBe(false);
    });

    it('should handle empty arrays correctly', () => {
      // Set up metadata with empty array
      setAegisMetadata({
        components: [
          {
            type: 'AI-Bot',
            timestamp: '2024-01-01T00:00:00Z',
            value: JSON.stringify([]),
          },
        ],
      });

      const emptyArray: string[] = [];
      const serializedValue = JSON.stringify(emptyArray);

      expect(isFieldValueAIBot('components', serializedValue)).toBe(true);
    });

    it('should handle single item arrays correctly', () => {
      // Set up metadata with single item array
      setAegisMetadata({
        components: [
          {
            type: 'AI-Bot',
            timestamp: '2024-01-01T00:00:00Z',
            value: JSON.stringify(['kernel']),
          },
        ],
      });

      const singleItemArray = ['kernel'];
      const serializedValue = JSON.stringify(singleItemArray);

      expect(isFieldValueAIBot('components', serializedValue)).toBe(true);
    });
  });
});
