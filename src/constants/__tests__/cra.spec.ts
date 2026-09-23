import { describe, expect, it } from 'vitest';

import { EU_STATE_CODES, normalizeEUStateCodes } from '@/constants/cra';

describe('normalizeEUStateCodes', () => {
  it('removes duplicate codes', () => {
    expect(normalizeEUStateCodes(['ES', 'FR', 'ES', 'DE'])).toEqual(['DE', 'ES', 'FR']);
  });

  it('filters out invalid codes', () => {
    expect(normalizeEUStateCodes(['ES', 'XX', 'FR', 'YY'])).toEqual(['ES', 'FR']);
  });

  it('sorts codes alphabetically', () => {
    expect(normalizeEUStateCodes(['FR', 'ES', 'DE'])).toEqual(['DE', 'ES', 'FR']);
  });

  it('handles empty array', () => {
    expect(normalizeEUStateCodes([])).toEqual([]);
  });

  it('handles all invalid codes', () => {
    expect(normalizeEUStateCodes(['XX', 'YY', 'ZZ'])).toEqual([]);
  });

  it('preserves all valid codes without duplicates', () => {
    const validCodes = ['ES', 'FR', 'DE', 'IT'];
    expect(normalizeEUStateCodes(validCodes)).toEqual(['DE', 'ES', 'FR', 'IT']);
  });

  it('handles mixed valid, invalid, and duplicate codes', () => {
    expect(normalizeEUStateCodes(['ES', 'XX', 'ES', 'FR', 'YY', 'DE', 'FR'])).toEqual(['DE', 'ES', 'FR']);
  });

  it('validates against EU_STATE_CODES', () => {
    const result = normalizeEUStateCodes(EU_STATE_CODES);
    expect(result).toHaveLength(EU_STATE_CODES.length);
    expect(result).toEqual([...EU_STATE_CODES].sort());
  });
});
