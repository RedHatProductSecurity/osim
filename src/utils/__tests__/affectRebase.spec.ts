import sampleFlawFull from '@/__tests__/__fixtures__/sampleFlawFull.json';
import type { ZodAffectType, ZodFlawType } from '@/types';
import {
  affectFromChoices,
  createdAffectConflicts,
  createdFormEdits,
  deletionConflicts,
  groupAffectConflicts,
  isStaleAffectWrite,
  rebaseAffects,
} from '@/utils/affectRebase';
import { deepCopyFromRaw } from '@/utils/helpers';

function loadedAffects() {
  return deepCopyFromRaw((sampleFlawFull as ZodFlawType).affects);
}

function withImpact(affect: ZodAffectType, impact: ZodAffectType['impact'], updatedDt: string) {
  return { ...affect, impact, updated_dt: updatedDt };
}

describe('isStaleAffectWrite', () => {
  const stale = { updated_dt: 'Affect has changed since it was retrieved.' };

  it('accepts a 409 and the bulk stale-token body at any status', () => {
    expect(isStaleAffectWrite({ response: { status: 409, data: { detail: 'outdated' } } })).toBe(true);
    expect(isStaleAffectWrite({ response: { status: 400, data: stale } })).toBe(true);
    expect(isStaleAffectWrite({ response: { status: 422, data: stale } })).toBe(true);
  });

  it('leaves a normal validation error alone', () => {
    expect(isStaleAffectWrite({ response: { status: 400, data: { impact: ['invalid'] } } })).toBe(false);
    expect(isStaleAffectWrite(new Error('network'))).toBe(false);
  });
});

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
    expect(result.updateServers).toEqual([expect.objectContaining({
      impact: server[0].impact,
      resolution: 'DELEGATED',
      uuid: server[0].uuid,
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

  it('asks for the affectedness pair instead of mixing NEW with OOSS', () => {
    const base = loadedAffects();
    const mine: ZodAffectType[] = [{ ...base[0], affectedness: 'NEW', resolution: '' }];
    const server: ZodAffectType[] = [{ ...base[0], resolution: 'OOSS', updated_dt: '2024-06-01T00:00:00Z' }];

    const result = rebaseAffects(base, mine, server);

    expect(result.updates).toEqual([]);
    expect(result.conflicts).toEqual([expect.objectContaining({
      field: 'state',
      id: `${base[0].uuid}:state`,
      mine: 'NEW',
      server: 'AFFECTED:OOSS',
    })]);
    expect(affectFromChoices(result.conflicted[0], { [`${base[0].uuid}:state`]: 'server' })).toEqual(
      expect.objectContaining({ affectedness: 'AFFECTED', resolution: 'OOSS' }),
    );
    expect(affectFromChoices(result.conflicted[0], { [`${base[0].uuid}:state`]: 'mine' })).toEqual(
      expect.objectContaining({ affectedness: 'NEW', resolution: '' }),
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

  it('treats a matching new affect as the same and lists fields that differ', () => {
    const server = loadedAffects()[0];
    const local = { ...server, ps_module: '', updated_dt: undefined, uuid: undefined };

    expect(createdAffectConflicts(local, server)).toEqual([]);
    expect(createdAffectConflicts(
      { ...local, not_affected_justification: '' },
      { ...server, not_affected_justification: null },
    )).toEqual([]);
    expect(createdAffectConflicts({ ...local, impact: 'CRITICAL' }, server).map(conflict => conflict.field))
      .toEqual(['impact']);
  });

  it('ignores a component OSIDB derived from the same purl', () => {
    const server = { ...loadedAffects()[0], ps_component: 'widget', purl: 'pkg:rpm/redhat/widget' };
    const local = { ...server, ps_component: '', ps_module: '', uuid: undefined };

    expect(createdAffectConflicts(local, server)).toEqual([]);
    expect(createdAffectConflicts({ ...local, ps_component: 'other' }, server).map(conflict => conflict.field))
      .toEqual(['ps_component']);
  });

  it('stores a duplicate state choice as the affectedness fields', () => {
    const server = loadedAffects()[0];
    const local = { ...server, affectedness: 'NEW' as const, ps_module: '', resolution: '' as const, uuid: undefined };
    const current = { ...server, resolution: 'OOSS' as const };
    const conflicts = createdAffectConflicts(local, current);

    expect(conflicts.map(conflict => conflict.field)).toEqual(['state']);
    const edits = createdFormEdits(local, current, conflicts);
    expect(edits).toEqual(['affectedness', 'resolution']);
    const row = { formEdits: edits, mine: local, server: current };
    expect(affectFromChoices(row, { [`${server.uuid}:state`]: 'mine' })).toEqual(
      expect.objectContaining({ affectedness: 'NEW', resolution: '' }),
    );
    expect(affectFromChoices(row, { [`${server.uuid}:state`]: 'server' })).toEqual(
      expect.objectContaining({ affectedness: 'AFFECTED', resolution: 'OOSS' }),
    );
  });

  it('asks once when a server purl would drop a component edit', () => {
    const base = loadedAffects();
    const mine = [{ ...base[0], ps_component: 'other' }];
    const server = [{
      ...base[0],
      ps_component: 'widget',
      purl: 'pkg:rpm/redhat/widget',
      updated_dt: '2024-06-01T00:00:00Z',
    }];

    const result = rebaseAffects(base, mine, server);

    expect(result.updates).toEqual([]);
    expect(result.conflicts.map(conflict => conflict.field)).toEqual(['identity']);
    expect(result.conflicts[0]).toEqual(expect.objectContaining({
      id: `${base[0].uuid}:identity`,
      mine: 'other',
      server: 'widget · pkg:rpm/redhat/widget',
    }));
    expect(affectFromChoices(result.conflicted[0], { [`${base[0].uuid}:identity`]: 'mine' })).toEqual(
      expect.objectContaining({ ps_component: 'other', purl: '' }),
    );
    expect(affectFromChoices(result.conflicted[0], { [`${base[0].uuid}:identity`]: 'server' })).toEqual(
      expect.objectContaining({ ps_component: 'widget', purl: 'pkg:rpm/redhat/widget' }),
    );
  });

  it('keeps an unrelated edit when the server adds a purl', () => {
    const base = loadedAffects();
    const mine = [withImpact(base[0], 'CRITICAL', base[0].updated_dt!)];
    const server = [{ ...base[0], purl: 'pkg:rpm/redhat/widget', updated_dt: '2024-06-01T00:00:00Z' }];

    const result = rebaseAffects(base, mine, server);

    expect(result.conflicts).toEqual([]);
    expect(result.updates[0]).toEqual(expect.objectContaining({
      impact: 'CRITICAL',
      ps_component: base[0].ps_component,
      purl: 'pkg:rpm/redhat/widget',
    }));
  });

  it('asks once when a local purl would drop a server component edit', () => {
    const base = loadedAffects();
    const mine = [{ ...base[0], purl: 'pkg:rpm/redhat/other' }];
    const server = [{ ...base[0], ps_component: 'server-component', updated_dt: '2024-06-01T00:00:00Z' }];

    const result = rebaseAffects(base, mine, server);

    expect(result.conflicts.map(conflict => conflict.field)).toEqual(['identity']);
    expect(affectFromChoices(result.conflicted[0], { [`${base[0].uuid}:identity`]: 'mine' })).toEqual(
      expect.objectContaining({ ps_component: base[0].ps_component, purl: 'pkg:rpm/redhat/other' }),
    );
    expect(affectFromChoices(result.conflicted[0], { [`${base[0].uuid}:identity`]: 'server' })).toEqual(
      expect.objectContaining({ ps_component: 'server-component', purl: '' }),
    );
  });

  it('asks before deleting an affect the server edited', () => {
    const loaded = loadedAffects()[0];
    const same = deletionConflicts([loaded], [loaded], [loaded]);
    expect(same.conflicts).toEqual([]);

    const server = withImpact(loaded, 'IMPORTANT', '2024-06-01T00:00:00Z');
    const result = deletionConflicts([loaded], [loaded], [server]);

    expect(result.blocked).toEqual([server]);
    expect(result.conflicts).toEqual([expect.objectContaining({
      field: 'deleted',
      id: `${loaded.uuid}:deleted`,
      mine: 'Deleted',
      server: 'Impact: IMPORTANT',
    })]);
  });
});
