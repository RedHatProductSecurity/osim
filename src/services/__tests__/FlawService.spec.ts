import { createTestingPinia } from '@pinia/testing';

import { useFlaw } from '@/composables/useFlaw';
import { createSuccessHandler } from '@/composables/service-helpers';

import { getFlaw, putFlaw } from '@/services/FlawService';
import { server } from '@/__tests__/setup';
import { handlers } from '@/mock-server/handlers';

const { blankFlaw } = useFlaw();

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
});
