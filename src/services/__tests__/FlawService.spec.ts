import { createTestingPinia } from '@pinia/testing';

import { blankFlaw } from '@/composables/useFlaw';
import { createSuccessHandler } from '@/composables/service-helpers';

import { getFlaw, putFlaw } from '@/services/FlawService';
import { server } from '@/__tests__/setup';
import { handlers } from '@/mock-server/handlers';

vi.mock('@/composables/service-helpers', () => ({
  createSuccessHandler: vi.fn().mockReturnValue(vi.fn()),
  createCatchHandler: vi.fn().mockReturnValue(vi.fn()),
}));

describe('flawService', () => {
  beforeAll(() => {
    createTestingPinia();
    server.use(...handlers);
  });

  it('should get flaw', async () => {
    const flaw = await getFlaw('1');

    flaw.embargoed = false;

    expect(flaw).toBeDefined();
    expect(flaw).toHaveProperty('uuid');
    // TODO: Remove this comment when OSIDB-3451 is resolved
    // expect(ZodFlawSchema.safeParse(flaw).success).toBe(true);
  });

  it('should update flaw', async () => {
    vi.spyOn(global, 'fetch');
    await putFlaw('1', {
      ...blankFlaw(),
      title: 'Test',
    }, false);

    expect(createSuccessHandler).toHaveBeenCalled();
  });

  it('should send client updated_dt on PUT without fetching a fresh one first', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch');
    const clientUpdatedDt = '2024-01-01T00:00:00Z';

    await putFlaw('1', {
      ...blankFlaw(),
      title: 'Test',
      updated_dt: clientUpdatedDt,
    }, false);

    const putCalls = fetchSpy.mock.calls.filter(([, init]) =>
      String(init?.method ?? '').toUpperCase() === 'PUT',
    );
    const getCallsForUpdatedDt = fetchSpy.mock.calls.filter(([url, init]) =>
      String(init?.method ?? 'GET').toUpperCase() === 'GET'
      && String(url).includes('include_fields=updated_dt'),
    );

    expect(putCalls.length).toBeGreaterThan(0);
    expect(getCallsForUpdatedDt).toHaveLength(0);

    const putBody = JSON.parse(String(putCalls[0][1]?.body));
    expect(putBody.updated_dt).toBe(clientUpdatedDt);
  });
});
