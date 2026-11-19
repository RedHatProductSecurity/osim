import { cvssDiffParts, cvssFromChoices, rebaseCvssScore, type CvssScoreSnapshot } from '@/utils/cvssRebase';

const base: CvssScoreSnapshot = {
  comment: '',
  cvss_version: 'V3',
  issuer: 'RH',
  score: 5.3,
  updated_dt: '2026-01-01T00:00:00Z',
  uuid: 'score-uuid',
  vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N',
};

describe('cvssDiffParts', () => {
  it('marks the score and the metrics that differ', () => {
    expect(cvssDiffParts(
      '7.5 CVSS:3.1/AV:N/AC:L/C:H',
      '9.1 CVSS:3.1/AV:N/AC:H/C:H',
    )).toEqual([
      { changed: true, text: '7.5' },
      { changed: false, text: ' ' },
      { changed: false, text: 'CVSS:3.1' },
      { changed: false, text: '/' },
      { changed: false, text: 'AV:N' },
      { changed: false, text: '/' },
      { changed: true, text: 'AC:L' },
      { changed: false, text: '/' },
      { changed: false, text: 'C:H' },
    ]);
  });

  it('leaves a non-vector conflict as plain text', () => {
    expect(cvssDiffParts('LOW', 'MODERATE')).toEqual([{ changed: false, text: 'LOW' }]);
  });
});

describe('rebaseCvssScore', () => {
  it('keeps a local edit and the server token when the server score is unchanged', () => {
    const local = { ...base, score: 7.5, vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N' };
    const server = { ...base, updated_dt: '2026-03-01T00:00:00Z' };

    const result = rebaseCvssScore(base, local, server, 'Flaw RH CVSSv3', 'flaw:RH:V3');

    expect(result.conflicts).toEqual([]);
    expect(result.merged).toMatchObject({
      updated_dt: '2026-03-01T00:00:00Z',
      uuid: 'score-uuid',
      vector: local.vector,
    });
  });

  it('asks when both sides changed the vector', () => {
    const local = { ...base, score: 7.5, vector: 'CVSS:3.1/MINE' };
    const server = { ...base, score: 9.1, updated_dt: '2026-03-01T00:00:00Z', vector: 'CVSS:3.1/SERVER' };

    const result = rebaseCvssScore(base, local, server, 'Flaw RH CVSSv3', 'flaw:RH:V3');

    expect(result.merged).toBeNull();
    expect(result.conflicts).toEqual([
      expect.objectContaining({
        field: 'vector',
        id: 'flaw:RH:V3:vector',
        mine: '7.5 CVSS:3.1/MINE',
        server: '9.1 CVSS:3.1/SERVER',
      }),
    ]);
  });

  it('treats a blank comment and null as the same value', () => {
    const local = { ...base, comment: '' };
    const server = { ...base, comment: null, updated_dt: '2026-03-01T00:00:00Z' };

    const result = rebaseCvssScore({ ...base, comment: null }, local, server, 'Flaw RH CVSSv3', 'flaw:RH:V3');

    expect(result.conflicts).toEqual([]);
  });

  it('adopts a matching score created on both sides', () => {
    const local = { ...base, updated_dt: null, uuid: null };
    const server = { ...base, uuid: 'server-score' };

    const result = rebaseCvssScore(undefined, local, server, 'Flaw RH CVSSv3', 'flaw:RH:V3');

    expect(result.conflicts).toEqual([]);
    expect(result.merged).toMatchObject({ uuid: 'server-score' });
  });

  it('asks when a new local score differs from the server score', () => {
    const local = { ...base, uuid: null, vector: 'CVSS:3.1/MINE' };
    const server = { ...base, vector: 'CVSS:3.1/SERVER' };

    const result = rebaseCvssScore(undefined, local, server, 'Affect RH CVSSv3', 'affect-1:RH:V3');

    expect(result.conflicts).toEqual([
      expect.objectContaining({ field: 'vector', id: 'affect-1:RH:V3:vector' }),
    ]);
  });

  it('offers a local edit of a score the server deleted', () => {
    const result = rebaseCvssScore(base, base, undefined, 'Flaw RH CVSSv3', 'flaw:RH:V3');

    expect(result.conflicts).toEqual([
      expect.objectContaining({ field: 'removed', id: 'flaw:RH:V3:removed', server: 'Removed' }),
    ]);
  });

  it('deletes a cleared score when the server copy is unchanged', () => {
    const local = { ...base, score: null, vector: null };

    const result = rebaseCvssScore(base, local, base, 'Flaw RH CVSSv3', 'flaw:RH:V3');

    expect(result.conflicts).toEqual([]);
    expect(result.remove).toBe(true);
  });

  it('keeps the chosen vector and the server token', () => {
    const local = { ...base, score: 7.5, vector: 'CVSS:3.1/MINE' };
    const server = { ...base, score: 9.1, updated_dt: '2026-04-01T00:00:00Z', vector: 'CVSS:3.1/SERVER' };

    const chosen = cvssFromChoices(local, server, ['vector'], { 'flaw:RH:V3:vector': 'server' }, 'flaw:RH:V3');

    expect(chosen).toMatchObject({
      score: 9.1,
      updated_dt: '2026-04-01T00:00:00Z',
      vector: 'CVSS:3.1/SERVER',
    });
  });
});
