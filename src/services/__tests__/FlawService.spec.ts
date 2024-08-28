import { sampleFlaw_1 } from '@/components/__tests__/__fixtures__/sampleFlaws';
import { putFlaw } from '../FlawService';
import { createTestingPinia } from '@pinia/testing';

createTestingPinia();

vi.mock('@/services/OsidbAuthService', async (original) => {
  return {
    ...await original<typeof import('@/services/OsidbAuthService')>(),
    getNextAccessToken: vi.fn().mockResolvedValue('token')
  };
});

vi.mock('jwt-decode', () => ({
  default: vi.fn(() => ({
    sub: '1234567890',
    name: 'Test User',
    exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 365)
  })),
}));

describe('FlawService', () => {
  const _fetch = global.fetch;

  const createFetchMock = (response?: any) => {
    return {
      json: vi.fn().mockResolvedValue({
        access: 'token',
        headers: {
          get: vi.fn().mockReturnValue('application/json')
        },
        ...response,
      }),
      ok: true,
    };
  };

  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi.fn().mockResolvedValue(createFetchMock());
  });

  afterAll(() => {
    global.fetch = _fetch;
  });


  it('Should get updated_dt when updating flaw', async () => {
    const flaw = sampleFlaw_1();
    const updated_dt = '2024-06-17T00:00:00Z';
    global.fetch = vi.fn().mockResolvedValue(createFetchMock({
      updated_dt
    }));

    await putFlaw(flaw.uuid, flaw);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('?include_fields=updated_dt'),
      expect.anything()
    );
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(`/osidb/api/v1/flaws/${flaw.uuid}`),
      expect.objectContaining({ body: expect.stringContaining(updated_dt) })
    );

  });
});
