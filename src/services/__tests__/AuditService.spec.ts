import { osidbFetch } from '@/services/OsidbAuthService';

import { getFlawAuditHistory } from '../AuditService';

vi.mock('@/services/OsidbAuthService', () => ({
  osidbFetch: vi.fn(),
}));

describe('auditService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches every audit history page', async () => {
    const firstHistoryItem = { pgh_slug: 'history-1' };
    const secondHistoryItem = { pgh_slug: 'history-2' };

    vi.mocked(osidbFetch)
      .mockResolvedValueOnce({
        data: {
          next: 'http://localhost:8000/osidb/api/v1/audit?limit=20&offset=20',
          results: [firstHistoryItem],
        },
      } as any)
      .mockResolvedValueOnce({
        data: {
          next: null,
          results: [secondHistoryItem],
        },
      } as any);

    const result = await getFlawAuditHistory('flaw-uuid');

    expect(result).toEqual([firstHistoryItem, secondHistoryItem]);
    expect(osidbFetch).toHaveBeenNthCalledWith(1, {
      method: 'get',
      url: '/osidb/api/v1/audit',
      params: {
        include_relation_events: true,
        pgh_obj_id: 'flaw-uuid',
        pgh_obj_model: 'osidb.Flaw',
      },
    });
    expect(osidbFetch).toHaveBeenNthCalledWith(2, {
      method: 'get',
      url: '/osidb/api/v1/audit?limit=20&offset=20',
    });
  });

  it('preserves direct response data fallback when results are absent', async () => {
    const historyItems = [{ pgh_slug: 'history-1' }];
    vi.mocked(osidbFetch).mockResolvedValue({ data: historyItems } as any);

    const result = await getFlawAuditHistory('flaw-uuid');

    expect(result).toEqual(historyItems);
    expect(osidbFetch).toHaveBeenCalledTimes(1);
  });
});
