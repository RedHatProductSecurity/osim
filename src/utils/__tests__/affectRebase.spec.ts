import sampleFlawFull from '@/__tests__/__fixtures__/sampleFlawFull.json';
import type { ZodAffectType, ZodFlawType } from '@/types';
import { affectFromChoices, groupAffectConflicts, rebaseAffects } from '@/utils/affectRebase';
import { deepCopyFromRaw } from '@/utils/helpers';

function loadedAffects() {
  return deepCopyFromRaw((sampleFlawFull as ZodFlawType).affects);
}

function withImpact(affect: ZodAffectType, impact: ZodAffectType['impact'], updatedDt: string) {
  return { ...affect, impact, updated_dt: updatedDt };
}

describe('affect rebase', () => {
  it('keeps an affect edit the server left alone and takes the new token', () => {
    const base = loadedAffects();
    const mine = loadedAffects();
    mine[0] = withImpact(mine[0], 'CRITICAL', mine[0].updated_dt!);
    const server = loadedAffects();
    server[0] = { ...server[0], resolution: 'DELEGATED', updated_dt: '2024-06-01T00:00:00Z' };

    const result = rebaseAffects(base, [mine[0]], server);

    expect(result.conflicts).toEqual([]);
    expect(result.updates).toEqual([expect.objectContaining({
      impact: 'CRITICAL',
      resolution: 'DELEGATED',
      updated_dt: '2024-06-01T00:00:00Z',
      uuid: mine[0].uuid,
    })]);
  });

  it('records a field both sides changed to different values', () => {
    const base = loadedAffects();
    const mine = [withImpact(base[0], 'CRITICAL', base[0].updated_dt!)];
    const server = [withImpact(base[0], 'IMPORTANT', '2024-06-01T00:00:00Z')];

    const result = rebaseAffects(base, mine, server);

    expect(result.updates).toEqual([]);
    expect(result.conflicts).toEqual([expect.objectContaining({
      field: 'impact',
      id: `${base[0].uuid}:impact`,
      mine: 'CRITICAL',
      server: 'IMPORTANT',
    })]);
    expect(affectFromChoices(result.conflicted[0], { [`${base[0].uuid}:impact`]: 'server' })).toEqual(
      expect.objectContaining({ impact: 'IMPORTANT', updated_dt: '2024-06-01T00:00:00Z' }),
    );
  });

  it('does not ask when both sides made the same edit', () => {
    const base = loadedAffects();
    const mine = [withImpact(base[0], 'CRITICAL', base[0].updated_dt!)];
    const server = [withImpact(base[0], 'CRITICAL', '2024-06-01T00:00:00Z')];

    const result = rebaseAffects(base, mine, server);

    expect(result.conflicts).toEqual([]);
    expect(result.updates[0].impact).toBe('CRITICAL');
    expect(result.updates[0].updated_dt).toBe('2024-06-01T00:00:00Z');
  });

  it('collapses the same field across many affects into one summary', () => {
    const base = loadedAffects();
    const conflicts = rebaseAffects(
      base,
      base.map(affect => withImpact(affect, 'CRITICAL', affect.updated_dt!)),
      base.map(affect => withImpact(affect, 'MODERATE', '2024-06-01T00:00:00Z')),
    ).conflicts;

    expect(groupAffectConflicts(conflicts)).toEqual([expect.objectContaining({
      id: 'affect-field:impact',
      label: 'Impact · 3 affects',
      mine: 'CRITICAL',
      server: 'MODERATE',
      rows: expect.any(Array),
    })]);
    expect(groupAffectConflicts(conflicts)[0].rows).toEqual([
      expect.objectContaining({
        detail: '',
        label: 'xxxx-0-001 · openshift-1 · openshift-1-1',
      }),
      expect.objectContaining({ label: 'xxxx-0-002 · openshift-2 · openshift-2-1' }),
      expect.objectContaining({ label: 'xxxx-0-005 · openshift-3 · openshift-3-1' }),
    ]);
  });

  it('treats an edited affect missing on the server as removed', () => {
    const base = loadedAffects();
    const mine = [withImpact(base[0], 'CRITICAL', base[0].updated_dt!)];

    const result = rebaseAffects(base, mine, []);

    expect(result.conflicts).toEqual([expect.objectContaining({
      field: 'removed',
      id: `${base[0].uuid}:removed`,
      server: 'Removed',
    })]);
    expect(result.removed).toHaveLength(1);
  });
});
