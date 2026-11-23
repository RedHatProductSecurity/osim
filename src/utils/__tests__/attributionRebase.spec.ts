import type { ZodFlawAcknowledgmentType, ZodFlawReferenceType } from '@/types';

import {
  ACKNOWLEDGMENT_CONFIG,
  REFERENCE_CONFIG,
  applyAttributionChoices,
  attributionDialogRows,
  rebaseAttributionCollection,
  summarizeAttributionItem,
} from '../attributionRebase';

function reference(overrides: Partial<ZodFlawReferenceType> = {}): ZodFlawReferenceType {
  return {
    description: 'loaded description',
    uuid: 'ref-1',
    type: 'EXTERNAL',
    url: 'https://example.com/loaded',
    embargoed: false,
    updated_dt: '2024-01-01T00:00:00Z',
    alerts: [],
    ...overrides,
  };
}

function acknowledgment(overrides: Partial<ZodFlawAcknowledgmentType> = {}): ZodFlawAcknowledgmentType {
  return {
    name: 'loaded name',
    affiliation: 'loaded affiliation',
    from_upstream: false,
    flaw: '',
    uuid: 'ack-1',
    embargoed: false,
    created_dt: null,
    updated_dt: '2024-01-01T00:00:00Z',
    alerts: [],
    ...overrides,
  };
}

describe('rebaseAttributionCollection', () => {
  it('adopts server updates for items the form left alone', () => {
    const base = [reference()];
    const mine = [reference()];
    const server = [reference({ description: 'server description', updated_dt: '2024-06-01T00:00:00Z' })];

    const result = rebaseAttributionCollection(base, mine, server, REFERENCE_CONFIG);

    expect(result.conflicts).toEqual([]);
    expect(result.adoptedUpdates).toEqual([server[0]]);
    expect(result.adoptedAdditions).toEqual([]);
    expect(result.adoptedRemovals).toEqual([]);
  });

  it('adopts server additions unknown to both the baseline and the form', () => {
    const added = reference({ uuid: 'ref-2', url: 'https://example.com/added' });
    const result = rebaseAttributionCollection([reference()], [reference()], [reference(), added], REFERENCE_CONFIG);

    expect(result.conflicts).toEqual([]);
    expect(result.adoptedAdditions).toEqual([added]);
  });

  it('adopts server removals of items the form left alone', () => {
    const result = rebaseAttributionCollection([reference()], [reference()], [], REFERENCE_CONFIG);

    expect(result.conflicts).toEqual([]);
    expect(result.adoptedRemovals).toEqual(['ref-1']);
  });

  it('conflicts when both sides edited the same item', () => {
    const base = [reference()];
    const mine = [reference({ url: 'https://example.com/mine' })];
    const server = [reference({ url: 'https://example.com/server', updated_dt: '2024-06-01T00:00:00Z' })];

    const result = rebaseAttributionCollection(base, mine, server, REFERENCE_CONFIG);

    expect(result.adoptedUpdates).toEqual([]);
    expect(result.conflicts).toEqual([{
      itemLabel: 'https://example.com/mine',
      kind: 'reference',
      mine: 'Link URL: https://example.com/mine',
      server: 'Link URL: https://example.com/server',
      uuid: 'ref-1',
    }]);
    expect(result.conflictedRows).toEqual([{
      kind: 'reference',
      mine: mine[0],
      server: server[0],
      uuid: 'ref-1',
    }]);
  });

  it('treats the same new value from both sides as an adoption, not a conflict', () => {
    const base = [reference()];
    const shared = reference({ url: 'https://example.com/shared', updated_dt: '2024-06-01T00:00:00Z' });

    const result = rebaseAttributionCollection(base, [shared], [shared], REFERENCE_CONFIG);

    expect(result.conflicts).toEqual([]);
    expect(result.adoptedUpdates).toEqual([shared]);
  });

  it('conflicts when the server removed an item the form edited', () => {
    const mine = [reference({ description: 'edited description' })];

    const result = rebaseAttributionCollection([reference()], mine, [], REFERENCE_CONFIG);

    expect(result.adoptedRemovals).toEqual([]);
    expect(result.conflicts).toEqual([{
      itemLabel: 'https://example.com/loaded',
      kind: 'reference',
      mine: 'Description: edited description',
      server: 'Removed',
      uuid: 'ref-1',
    }]);
    expect(result.conflictedRows).toEqual([{ kind: 'reference', mine: mine[0], server: null, uuid: 'ref-1' }]);
  });

  it('ignores local-new items without a uuid', () => {
    const localNew = reference({ uuid: '', updated_dt: null, url: 'https://example.com/new' });

    const result = rebaseAttributionCollection([], [localNew], [], REFERENCE_CONFIG);

    expect(result.conflicts).toEqual([]);
    expect(result.adoptedAdditions).toEqual([]);
    expect(result.adoptedUpdates).toEqual([]);
    expect(result.adoptedRemovals).toEqual([]);
  });

  it('keeps items the form dropped deleted instead of adopting them back', () => {
    // The server still has ref-2, but the form deleted it locally: the rebase
    // must not re-add it and must not report it as a server addition.
    const base = [reference(), reference({ uuid: 'ref-2', url: 'https://example.com/two' })];
    const server = [reference(), reference({ uuid: 'ref-2', url: 'https://example.com/two' })];

    const result = rebaseAttributionCollection(base, [reference()], server, REFERENCE_CONFIG);

    expect(result.adoptedAdditions).toEqual([]);
    expect(result.adoptedRemovals).toEqual([]);
    expect(result.conflicts).toEqual([]);
  });

  it('conflicts when the form removed an item the server edited', () => {
    const base = [reference(), reference({ uuid: 'ref-2', url: 'https://example.com/two' })];
    const serverEdited = reference({
      uuid: 'ref-2',
      url: 'https://example.com/two-server',
      updated_dt: '2024-06-01T00:00:00Z',
    });

    const result = rebaseAttributionCollection(base, [reference()], [reference(), serverEdited], REFERENCE_CONFIG);

    expect(result.conflicts).toEqual([{
      itemLabel: 'https://example.com/two',
      kind: 'reference',
      mine: 'Removed',
      server: 'Link URL: https://example.com/two-server',
      uuid: 'ref-2',
    }]);
    expect(result.conflictedRows).toEqual([{ kind: 'reference', mine: null, server: serverEdited, uuid: 'ref-2' }]);
    expect(result.adoptedAdditions).toEqual([]);
  });

  it('conflicts when the form removed an acknowledgment the server edited', () => {
    const base = [acknowledgment(), acknowledgment({ uuid: 'ack-2', name: 'second name' })];
    const serverEdited = acknowledgment({
      uuid: 'ack-2',
      name: 'second name',
      affiliation: 'server affiliation',
      updated_dt: '2024-06-01T00:00:00Z',
    });

    const result = rebaseAttributionCollection(
      base,
      [acknowledgment()],
      [acknowledgment(), serverEdited],
      ACKNOWLEDGMENT_CONFIG,
    );

    expect(result.conflicts).toEqual([{
      itemLabel: 'second name',
      kind: 'acknowledgment',
      mine: 'Removed',
      server: 'Affiliation: server affiliation',
      uuid: 'ack-2',
    }]);
  });

  it('does not treat server-managed fields as changes', () => {
    // updated_dt, embargoed, and alerts are server-managed: a server copy that
    // differs only in them must count as unchanged.
    const base = [reference()];
    const mine = [reference()];
    const serverAlerts = [{
      uuid: 'alert-1',
      name: 'alert',
      description: '',
      alert_type: 'ERROR',
      resolution_steps: '',
    } as never];
    const server = [
      reference({
        updated_dt: '2024-06-01T00:00:00Z',
        embargoed: true,
        alerts: serverAlerts,
      }),
    ];

    const result = rebaseAttributionCollection(base, mine, server, REFERENCE_CONFIG);

    expect(result.adoptedUpdates).toEqual([]);
    expect(result.adoptedRemovals).toEqual([]);
    expect(result.conflicts).toEqual([]);
  });

  it('treats a uuid the baseline never saw as locally changed', () => {
    // Saved by an earlier session after page load: the server copy equals the
    // form copy, so nothing conflicts and nothing is adopted.
    const saved = reference({ uuid: 'ref-late', url: 'https://example.com/late', updated_dt: '2024-06-01T00:00:00Z' });

    const result = rebaseAttributionCollection([], [saved], [saved], REFERENCE_CONFIG);

    expect(result.conflicts).toEqual([]);
    expect(result.adoptedUpdates).toEqual([]);
  });

  it('compares acknowledgments on name, affiliation, and from_upstream', () => {
    const base = [acknowledgment()];
    const mine = [acknowledgment({ affiliation: 'mine affiliation' })];
    const server = [acknowledgment({ from_upstream: true, updated_dt: '2024-06-01T00:00:00Z' })];

    const result = rebaseAttributionCollection(base, mine, server, ACKNOWLEDGMENT_CONFIG);

    expect(result.conflicts).toEqual([{
      itemLabel: 'loaded name',
      kind: 'acknowledgment',
      mine: 'Affiliation: mine affiliation',
      server: 'From upstream: Yes',
      uuid: 'ack-1',
    }]);
  });
});

describe('summarizeAttributionItem', () => {
  it('lists only the fields that differ from the base', () => {
    const summary = summarizeAttributionItem(
      reference({ url: 'https://example.com/base', description: 'base description' }),
      reference({ url: 'https://example.com/mine', description: 'base description' }),
      REFERENCE_CONFIG,
    );

    expect(summary).toBe('Link URL: https://example.com/mine');
  });

  it('lists every field against a null base', () => {
    const summary = summarizeAttributionItem(null, reference(), REFERENCE_CONFIG);

    expect(summary).toBe(['Link URL: https://example.com/loaded', 'Description: loaded description', 'Reference type: EXTERNAL'].join('\n'));
  });

  it('formats booleans and empty values for the dialog', () => {
    const summary = summarizeAttributionItem(
      acknowledgment(),
      acknowledgment({ from_upstream: true, affiliation: '' }),
      ACKNOWLEDGMENT_CONFIG,
    );

    expect(summary).toBe('Affiliation: Empty\nFrom upstream: Yes');
  });
});

describe('applyAttributionChoices', () => {
  it('keeps the local item stamped with the server token for a mine choice', () => {
    const mine = reference({ url: 'https://example.com/mine' });
    const server = reference({ url: 'https://example.com/server', updated_dt: '2024-06-01T00:00:00Z' });

    const outcome = applyAttributionChoices(
      [{ kind: 'reference', mine, server, uuid: 'ref-1' }],
      { 'reference:ref-1': 'mine' },
    );

    expect(outcome).toEqual({
      adoptServer: [],
      drop: [],
      keepMine: [{ ...mine, updated_dt: '2024-06-01T00:00:00Z' }],
      keepRemoved: [],
      recreate: [],
    });
  });

  it('adopts the server copy for a server choice', () => {
    const server = reference({ url: 'https://example.com/server' });

    const outcome = applyAttributionChoices(
      [{ kind: 'reference', mine: reference(), server, uuid: 'ref-1' }],
      { 'reference:ref-1': 'server' },
    );

    expect(outcome.adoptServer).toEqual([server]);
    expect(outcome.keepMine).toEqual([]);
  });

  it('re-creates a server-removed item the user kept', () => {
    const mine = reference({ url: 'https://example.com/mine' });

    const outcome = applyAttributionChoices(
      [{ kind: 'reference', mine, server: null, uuid: 'ref-1' }],
      { 'reference:ref-1': 'mine' },
    );

    expect(outcome.recreate).toEqual([{ ...mine, uuid: '', updated_dt: null }]);
    expect(outcome.drop).toEqual([]);
    expect(outcome.keepMine).toEqual([]);
  });

  it('drops a server-removed item the user gave up', () => {
    const outcome = applyAttributionChoices(
      [{ kind: 'reference', mine: reference(), server: null, uuid: 'ref-1' }],
      { 'reference:ref-1': 'server' },
    );

    expect(outcome.drop).toEqual(['ref-1']);
    expect(outcome.recreate).toEqual([]);
  });

  it('resurrects the server copy for a server choice on a form-removed item', () => {
    const server = reference({ url: 'https://example.com/server', updated_dt: '2024-06-01T00:00:00Z' });

    const outcome = applyAttributionChoices(
      [{ kind: 'reference', mine: null, server, uuid: 'ref-1' }],
      { 'reference:ref-1': 'server' },
    );

    expect(outcome.adoptServer).toEqual([server]);
    expect(outcome.keepRemoved).toEqual([]);
    expect(outcome.recreate).toEqual([]);
  });

  it('keeps the local removal for a mine choice on a form-removed item', () => {
    const outcome = applyAttributionChoices(
      [{ kind: 'reference', mine: null, server: reference(), uuid: 'ref-1' }],
      { 'reference:ref-1': 'mine' },
    );

    expect(outcome.keepRemoved).toEqual(['ref-1']);
    expect(outcome.adoptServer).toEqual([]);
    expect(outcome.keepMine).toEqual([]);
    expect(outcome.recreate).toEqual([]);
  });

  it('defaults to keeping the removal when a form-removed item has no choice', () => {
    const outcome = applyAttributionChoices(
      [{ kind: 'reference', mine: null, server: reference(), uuid: 'ref-1' }],
      {},
    );

    expect(outcome.keepRemoved).toEqual(['ref-1']);
  });

  it('defaults to the local side when a row has no choice', () => {
    const mine = acknowledgment({ name: 'mine name' });
    const removed = acknowledgment({ name: 'removed name' });

    const outcome = applyAttributionChoices([
      { kind: 'acknowledgment', mine, server: acknowledgment({ name: 'server name' }), uuid: 'ack-1' },
      { kind: 'acknowledgment', mine: removed, server: null, uuid: 'ack-2' },
    ], {});

    expect(outcome.keepMine).toEqual([mine]);
    expect(outcome.recreate).toEqual([{ ...removed, uuid: '', updated_dt: null }]);
  });
});

describe('attributionDialogRows', () => {
  it('formats conflicts as dialog rows keyed by kind and uuid', () => {
    const rows = attributionDialogRows([
      {
        itemLabel: 'https://example.com/mine',
        kind: 'reference',
        mine: 'Link URL: https://example.com/mine',
        server: 'Link URL: https://example.com/server',
        uuid: 'ref-1',
      },
      {
        itemLabel: 'Simon McVittie',
        kind: 'acknowledgment',
        mine: 'Affiliation: Red Hat',
        server: 'Removed',
        uuid: 'ack-1',
      },
    ]);

    expect(rows).toEqual([
      {
        id: 'reference:ref-1',
        label: 'Reference · https://example.com/mine',
        mine: 'Link URL: https://example.com/mine',
        server: 'Link URL: https://example.com/server',
      },
      {
        id: 'acknowledgment:ack-1',
        label: 'Acknowledgment · Simon McVittie',
        mine: 'Affiliation: Red Hat',
        server: 'Removed',
      },
    ]);
  });

  it('falls back to the kind name when the item has no label value', () => {
    const rows = attributionDialogRows([{
      itemLabel: 'Reference',
      kind: 'reference',
      mine: 'Link URL: Empty',
      server: 'Link URL: https://example.com/server',
      uuid: 'ref-1',
    }]);

    expect(rows[0].label).toBe('Reference · Reference');
  });
});
