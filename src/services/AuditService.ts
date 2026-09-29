import { osidbFetch } from '@/services/OsidbAuthService';
import type { ZodFlawHistoryItemType } from '@/types/zodFlaw';

export async function getFlawAuditHistory(flawId: string): Promise<ZodFlawHistoryItemType[]> {
  try {
    const response = await osidbFetch({
      method: 'get',
      url: '/osidb/api/v1/audit',
      params: {
        include_relation_events: true,
        pgh_obj_id: flawId,
        pgh_obj_model: 'osidb.Flaw',
      },
    });

    // The API returns paginated results, so we need to extract the results array
    // Handle both direct data and nested data.results structures
    if (response?.data) {
      if (!response.data.results) return response.data || [];

      const history = [...response.data.results];
      let nextUrl = response.data.next;

      while (nextUrl) {
        const url = new URL(nextUrl);
        const nextResponse = await osidbFetch({
          method: 'get',
          url: url.pathname + url.search,
        });

        history.push(...nextResponse.data.results);
        nextUrl = nextResponse.data.next;

        if (nextResponse.data.results.length === 0) break;
      }

      return history;
    }
    return [];
  } catch (error) {
    console.error('AuditService::getFlawAuditHistory() Error fetching audit history:', error);
    throw error;
  }
}
