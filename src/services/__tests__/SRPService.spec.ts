import { createTestingPinia } from '@pinia/testing';

import { createSuccessHandler } from '@/composables/service-helpers';

import { osidbFetch } from '@/services/OsidbAuthService';
import {
  createAdditionalInfoMilestone,
  fetchSRPReports,
  updateSRPMilestone,
  updateSRPReport,
} from '@/services/SRPService';

vi.mock('@/services/OsidbAuthService', () => ({
  osidbFetch: vi.fn(),
}));

vi.mock('@/composables/service-helpers', () => ({
  createCatchHandler: vi.fn().mockReturnValue(vi.fn()),
  createSuccessHandler: vi.fn().mockReturnValue(vi.fn()),
}));

describe('sRPService', () => {
  beforeAll(() => {
    createTestingPinia();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches SRP reports', async () => {
    vi.mocked(osidbFetch).mockResolvedValue({
      data: { results: [{ uuid: 'report-1' }] },
    } as any);

    const result = await fetchSRPReports('flaw-123');

    expect(result).toEqual([{ uuid: 'report-1' }]);
  });

  it('throws error on fetch failure', async () => {
    vi.mocked(osidbFetch).mockRejectedValue(new Error('Network error'));

    await expect(fetchSRPReports('flaw-789')).rejects.toThrow('Network error');
  });

  it('updates SRP report', async () => {
    vi.mocked(osidbFetch).mockResolvedValue({ data: {} } as any);

    await updateSRPReport('report-1', { status: 'submitted' });

    expect(createSuccessHandler).toHaveBeenCalled();
  });

  it('updates SRP milestone', async () => {
    vi.mocked(osidbFetch).mockResolvedValue({ data: {} } as any);

    await updateSRPMilestone('milestone-1', { status: 'submitted' });

    expect(createSuccessHandler).toHaveBeenCalled();
  });

  it('creates additional info milestone', async () => {
    vi.mocked(osidbFetch).mockResolvedValue({ data: {} } as any);

    await createAdditionalInfoMilestone('report-1', { milestone_type: 'additional_information_response' });

    expect(createSuccessHandler).toHaveBeenCalled();
  });
});
