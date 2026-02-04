import { osidbFetch } from '@/services/OsidbAuthService';
import type { ZodFlawHistoryItemType } from '@/types/zodFlaw';

export async function getFlawAuditHistory(flawId: string): Promise<ZodFlawHistoryItemType[]> {
  try {
    const response = await osidbFetch({
      method: 'get',
      url: '/osidb/api/v1/audit',
      params: {
        pgh_obj_id: flawId,
        pgh_obj_model: 'osidb.Flaw',
      },
    });

    // The API returns paginated results, so we need to extract the results array
    // Handle both direct data and nested data.results structures
    if (response?.data) {
      return response.data.results || response.data || [];
    }
    return [];
  } catch (error) {
    console.error('AuditService::getFlawAuditHistory() Error fetching audit history:', error);
    throw error;
  }
}
