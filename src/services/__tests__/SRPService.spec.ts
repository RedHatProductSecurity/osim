import { createTestingPinia } from '@pinia/testing';

import { osidbFetch } from '@/services/OsidbAuthService';
import {
  createAdditionalInfoRequest,
  createSRPReport,
  fetchSRPReports,
  updateAdditionalInfoRequest,
  updateSRPMilestone,
  updateSRPReport,
} from '@/services/SRPService';

vi.mock('@/services/OsidbAuthService', () => ({
  osidbFetch: vi.fn(),
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

  it('creates SRP report', async () => {
    vi.mocked(osidbFetch).mockResolvedValue({ data: {} } as any);

    await createSRPReport('flaw-123', { title: 'New Report' });

    expect(osidbFetch).toHaveBeenCalledWith({
      method: 'POST',
      url: '/regulatory-reporting/api/v1/srp-reports',
      data: { title: 'New Report', flaw_id: 'flaw-123' },
    });
  });

  it('handles createSRPReport error', async () => {
    vi.mocked(osidbFetch).mockRejectedValue(new Error('Create failed'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(createSRPReport('flaw-123', { title: 'New Report' })).rejects.toThrow('Create failed');

    expect(console.error).toHaveBeenCalledWith(
      'service-helpers::createCatchHandler() Error creating SRP report:',
      expect.any(Error),
    );
  });

  it('updates SRP report', async () => {
    vi.mocked(osidbFetch).mockResolvedValue({ data: {} } as any);

    await updateSRPReport('report-1', { status: 'submitted' });

    expect(osidbFetch).toHaveBeenCalledWith({
      method: 'PUT',
      url: '/regulatory-reporting/api/v1/srp-reports/report-1',
      data: { status: 'submitted' },
    });
  });

  it('updates SRP milestone', async () => {
    vi.mocked(osidbFetch).mockResolvedValue({ data: {} } as any);

    await updateSRPMilestone('report-1', 'milestone-1', { status: 'submitted' });

    expect(osidbFetch).toHaveBeenCalledWith({
      method: 'PUT',
      url: '/regulatory-reporting/api/v1/srp-reports/report-1/milestones/milestone-1',
      data: { status: 'submitted' },
    });
  });

  it('creates additional info request', async () => {
    vi.mocked(osidbFetch).mockResolvedValue({ data: {} } as any);

    await createAdditionalInfoRequest('report-1', 'milestone-1', {
      request_source: 'ENISA',
      request_text: 'Need more info',
    });

    expect(osidbFetch).toHaveBeenCalledWith({
      method: 'POST',
      url: '/regulatory-reporting/api/v1/srp-reports/report-1/milestones/milestone-1/additional-information-requests',
      data: {
        request_source: 'ENISA',
        request_text: 'Need more info',
      },
    });
  });

  it('updates additional info request', async () => {
    vi.mocked(osidbFetch).mockResolvedValue({ data: {} } as any);

    await updateAdditionalInfoRequest('report-1', 'milestone-1', 'air-1', {
      response_text: 'Here is the info',
    });

    expect(osidbFetch).toHaveBeenCalledWith({
      method: 'PUT',
      url:
        '/regulatory-reporting/api/v1/srp-reports/report-1' +
        '/milestones/milestone-1/additional-information-requests/air-1',
      data: {
        response_text: 'Here is the info',
      },
    });
  });
});
