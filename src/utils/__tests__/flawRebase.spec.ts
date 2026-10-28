import sampleFlawRequired from '@/__tests__/__fixtures__/sampleFlawRequired.json';
import type { ZodFlawType } from '@/types';
import { deepCopyFromRaw } from '@/utils/helpers';

import { formatCollisionValue, isFlawConflict, rebaseDisjointFlaw } from '../flawRebase';

function flaw(overrides: Partial<ZodFlawType> = {}): ZodFlawType {
  return {
    ...deepCopyFromRaw(sampleFlawRequired as ZodFlawType),
    ...overrides,
  };
}

describe('rebaseDisjointFlaw', () => {
  it('keeps form edits and takes server values for fields the form did not change', () => {
    const base = flaw();
    const mine = flaw({
      title: 'analyst title',
      affects: [{ uuid: 'local-affect' } as ZodFlawType['affects'][number]],
    });
    const server = flaw({
      statement: 'bot statement',
      cwe_id: 'CWE-79',
      updated_dt: '2024-06-01T00:00:00Z',
      affects: [],
    });

    const result = rebaseDisjointFlaw(base, mine, server);

    expect(result.conflicts).toEqual([]);
    expect(result.adopted).toEqual(['cwe_id', 'statement']);
    expect(result.merged).toEqual(expect.objectContaining({
      title: 'analyst title',
      statement: 'bot statement',
      cwe_id: 'CWE-79',
      updated_dt: '2024-06-01T00:00:00Z',
      affects: mine.affects,
    }));
  });

  it('reports a conflict when the form and the server changed the same field', () => {
    const base = flaw();
    const mine = flaw({ title: 'analyst title' });
    const server = flaw({ title: 'bot title', statement: 'bot statement', updated_dt: '2024-06-01T00:00:00Z' });

    const result = rebaseDisjointFlaw(base, mine, server);

    expect(result.conflicts).toEqual([{
      field: 'title',
      mine: 'analyst title',
      server: 'bot title',
    }]);
    expect(result.adopted).toEqual(['statement']);
    expect(result.merged).toBeNull();
  });

  it('treats the same new value from both sides as not a conflict', () => {
    const base = flaw();
    const mine = flaw({ title: 'shared title' });
    const server = flaw({ title: 'shared title', updated_dt: '2024-06-01T00:00:00Z' });

    const result = rebaseDisjointFlaw(base, mine, server);

    expect(result.conflicts).toEqual([]);
    expect(result.merged?.title).toBe('shared title');
    expect(result.merged?.updated_dt).toBe('2024-06-01T00:00:00Z');
  });

  it('treats null and a missing value as equal', () => {
    const base = flaw({ owner: null });
    const mine = flaw({ owner: undefined });
    const server = flaw({
      owner: null,
      statement: 'bot statement',
      updated_dt: '2024-06-01T00:00:00Z',
    });

    const result = rebaseDisjointFlaw(base, mine, server);

    expect(result.conflicts).toEqual([]);
    expect(result.adopted).toEqual(['statement']);
  });
});

describe('formatCollisionValue', () => {
  it('lists plain values instead of a JSON array', () => {
    expect(formatCollisionValue(['kernel', 'openssl'])).toBe('kernel\nopenssl');
    expect(formatCollisionValue([])).toBe('Empty');
  });
});

describe('isFlawConflict', () => {
  it('matches an OSIDB 409', () => {
    expect(isFlawConflict({ response: { status: 409 } })).toBe(true);
    expect(isFlawConflict({ response: { status: 400 } })).toBe(false);
    expect(isFlawConflict(new Error('network'))).toBe(false);
  });
});
