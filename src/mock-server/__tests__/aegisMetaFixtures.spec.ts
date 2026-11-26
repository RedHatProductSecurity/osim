import { aegisMetaFixtures } from '@/mock-server/aegisMetaFixtures';
import { handlers } from '@/mock-server/handlers';
import { server } from '@/__tests__/setup';

function fixtureFor(marker: string) {
  const fixture = aegisMetaFixtures.find((candidate) => candidate.marker === marker);
  if (!fixture) throw new Error(`No aegis_meta fixture found for marker '${marker}'`);
  return fixture;
}

async function fetchFlaw(id: string, init?: RequestInit) {
  const response = await fetch(`http://localhost:3000/osidb/api/v2/flaws/${id}`, init);
  return { flaw: await response.json(), response };
}

describe('aegisMetaFixtures', () => {
  beforeAll(() => {
    server.use(...handlers);
  });

  it('serves the pending suggestion fixture for aegis-pending', async () => {
    const { flaw, response } = await fetchFlaw('aegis-pending');

    expect(response.status).toBe(200);
    expect(flaw).toHaveProperty('uuid');
    expect(flaw.impact).toBe('CRITICAL');
    expect(flaw.aegis_meta.impact).toHaveLength(1);

    const entry = flaw.aegis_meta.impact[0];
    expect(entry.type).toBe('AI-Bot-Pending');
    expect(entry.value).toBe('LOW');
    expect(entry.confidence).toBe(0.86);
    expect(entry.data_quality).toBe(0.74);
    expect(entry.tools_used).toEqual(['cvss-calculator', 'impact-rules', 'flaw-history']);
    expect(flaw.aegis_meta).toEqual(fixtureFor('aegis-pending').aegis_meta);
  });

  it('serves the superseded suggestion fixture for aegis-superseded', async () => {
    const { flaw } = await fetchFlaw('aegis-superseded');

    expect(flaw.impact).toBe('LOW');
    expect(flaw.aegis_meta.impact).toHaveLength(2);
    expect(flaw.aegis_meta.impact[0].type).toBe('AI-Bot-Pending');
    expect(flaw.aegis_meta.impact[1].type).toBe('AI-Bot');
    expect(flaw.aegis_meta).toEqual(fixtureFor('aegis-superseded').aegis_meta);
  });

  it('serves a pending suggestion matching the current impact for aegis-value-match', async () => {
    const { flaw } = await fetchFlaw('aegis-value-match');

    expect(flaw.impact).toBe('LOW');
    expect(flaw.aegis_meta.impact).toHaveLength(1);
    expect(flaw.aegis_meta.impact[0].type).toBe('AI-Bot-Pending');
    expect(flaw.aegis_meta.impact[0].value).toBe(flaw.impact);
    expect(flaw.aegis_meta).toEqual(fixtureFor('aegis-value-match').aegis_meta);
  });

  it('serves a pending entry without a value for aegis-malformed', async () => {
    const { flaw } = await fetchFlaw('aegis-malformed');

    expect(flaw.impact).toBe('CRITICAL');
    expect(flaw.aegis_meta.impact).toHaveLength(1);
    expect(flaw.aegis_meta.impact[0].type).toBe('AI-Bot-Pending');
    expect(flaw.aegis_meta.impact[0]).not.toHaveProperty('value');
    expect(flaw.aegis_meta).toEqual(fixtureFor('aegis-malformed').aegis_meta);
  });

  it.each(['1', '4b6dc7e3-1a5c-49ea-a3f3-bf02d16d1d43', 'aegis-only'])(
    'keeps aegis_meta null for an id without a fixture marker (%s)',
    async (id) => {
      const { flaw, response } = await fetchFlaw(id);

      expect(response.status).toBe(200);
      expect(flaw).toHaveProperty('uuid');
      expect(flaw.aegis_meta).toBeNull();
    },
  );

  it('matches the fixture marker as a substring of the flaw id', async () => {
    const { flaw } = await fetchFlaw('flaw-aegis-pending-123');

    expect(flaw.impact).toBe('CRITICAL');
    expect(flaw.aegis_meta.impact).toHaveLength(1);
    expect(flaw.aegis_meta).toEqual(fixtureFor('aegis-pending').aegis_meta);
  });

  it('echoes the PUT body over the generated flaw so accept decisions survive a save', async () => {
    const body = { impact: 'LOW', aegis_meta: fixtureFor('aegis-superseded').aegis_meta };

    const { flaw, response } = await fetchFlaw('aegis-pending', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    expect(response.status).toBe(200);
    expect(flaw).toHaveProperty('uuid');
    expect(flaw.impact).toBe('LOW');
    expect(flaw.aegis_meta).toEqual(body.aegis_meta);
  });

  it.each([
    { label: 'no body', init: { method: 'PUT' } },
    { label: 'invalid JSON body', init: { method: 'PUT', body: 'not json {' } },
    { label: 'non-object JSON body', init: { method: 'PUT', body: '42' } },
  ])('falls back to the generated flaw for a PUT with $label', async ({ init }) => {
    const { flaw, response } = await fetchFlaw('aegis-pending', init);

    expect(response.status).toBe(200);
    expect(flaw).toHaveProperty('uuid');
    expect(flaw.aegis_meta).toBeNull();
  });
});
