import { createCatchHandler, createSuccessHandler } from '@/composables/service-helpers';

import type { AdditionalInformationRequest, SRPReport, SRPReportMilestone } from '@/types/cra';
import { osidbFetch } from '@/services/OsidbAuthService';

export async function fetchSRPReports(flawId: string): Promise<SRPReport[]> {
  const response = await osidbFetch({
    method: 'GET',
    url: `/regulatory-reporting/api/v1/flaws/${flawId}/srp-reports`,
  });

  return (response.data?.results || response.data || []) as SRPReport[];
}

export async function createSRPReport(
  flawId: string,
  data: Partial<SRPReport>,
) {
  return osidbFetch({
    method: 'POST',
    url: '/regulatory-reporting/api/v1/srp-reports',
    data: {
      ...data,
      flaw_id: flawId,
    },
  })
    .then(createSuccessHandler({ title: 'Success!', body: 'SRP report created successfully.' }))
    .catch(createCatchHandler('Error creating SRP report:'));
}

export async function updateSRPReport(
  reportUuid: string,
  data: Partial<SRPReport>,
) {
  return osidbFetch({
    method: 'PUT',
    url: `/regulatory-reporting/api/v1/srp-reports/${reportUuid}`,
    data,
  })
    .then(createSuccessHandler({ title: 'Success!', body: 'SRP report updated successfully.' }))
    .catch(createCatchHandler('Error updating SRP report:'));
}

export async function updateSRPMilestone(
  reportUuid: string,
  milestoneUuid: string,
  data: Partial<SRPReportMilestone>,
) {
  return osidbFetch({
    method: 'PUT',
    url: `/regulatory-reporting/api/v1/srp-reports/${reportUuid}/milestones/${milestoneUuid}`,
    data,
  })
    .then(createSuccessHandler({ title: 'Success!', body: 'SRP milestone updated successfully.' }))
    .catch(createCatchHandler('Error updating SRP milestone:'));
}

// ── Additional Information Request (AIR) endpoints ──────────────────────────

export async function fetchAdditionalInfoRequests(
  reportUuid: string,
  milestoneUuid: string,
): Promise<AdditionalInformationRequest[]> {
  const response = await osidbFetch({
    method: 'GET',
    url:
      `/regulatory-reporting/api/v1/srp-reports/${reportUuid}` +
      `/milestones/${milestoneUuid}/additional-information-requests`,
  });

  return (response.data?.results || response.data || []) as AdditionalInformationRequest[];
}

export async function createAdditionalInfoRequest(
  reportUuid: string,
  milestoneUuid: string,
  data: Partial<AdditionalInformationRequest>,
) {
  return osidbFetch({
    method: 'POST',
    url:
      `/regulatory-reporting/api/v1/srp-reports/${reportUuid}` +
      `/milestones/${milestoneUuid}/additional-information-requests`,
    data,
  })
    .then(
      createSuccessHandler({
        title: 'Success!',
        body: 'Additional information request created successfully.',
      }),
    )
    .catch(createCatchHandler('Error creating additional information request:'));
}

export async function updateAdditionalInfoRequest(
  reportUuid: string,
  milestoneUuid: string,
  airUuid: string,
  data: Partial<AdditionalInformationRequest>,
) {
  return osidbFetch({
    method: 'PUT',
    url:
      `/regulatory-reporting/api/v1/srp-reports/${reportUuid}` +
      `/milestones/${milestoneUuid}/additional-information-requests/${airUuid}`,
    data,
  })
    .then(
      createSuccessHandler({
        title: 'Success!',
        body: 'Additional information request updated successfully.',
      }),
    )
    .catch(createCatchHandler('Error updating additional information request:'));
}
