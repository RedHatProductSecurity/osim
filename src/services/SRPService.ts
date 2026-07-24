import { createCatchHandler, createSuccessHandler } from '@/composables/service-helpers';

import type { SRPReport, SRPReportMilestone } from '@/types/cra';
import { osidbFetch } from '@/services/OsidbAuthService';

export async function fetchSRPReports(flawId: string): Promise<SRPReport[]> {
  const response = await osidbFetch({
    method: 'GET',
    url: `/osidb/api/v1/flaws/${flawId}/srp-reports`,
  });

  return (response.data?.results || response.data || []) as SRPReport[];
}

export async function updateSRPReport(
  reportUuid: string,
  data: Partial<SRPReport>,
) {
  return osidbFetch({
    method: 'PUT',
    url: `/osidb/api/v1/srp-reports/${reportUuid}`,
    data,
  })
    .then(createSuccessHandler({ title: 'Success!', body: 'SRP report updated successfully.' }))
    .catch(createCatchHandler('Error updating SRP report:'));
}

export async function updateSRPMilestone(
  milestoneUuid: string,
  data: Partial<SRPReportMilestone>,
) {
  return osidbFetch({
    method: 'PUT',
    url: `/osidb/api/v1/srp-milestones/${milestoneUuid}`,
    data,
  })
    .then(createSuccessHandler({ title: 'Success!', body: 'SRP milestone updated successfully.' }))
    .catch(createCatchHandler('Error updating SRP milestone:'));
}

export async function createAdditionalInfoMilestone(
  reportUuid: string,
  data: Partial<SRPReportMilestone>,
) {
  return osidbFetch({
    method: 'POST',
    url: `/osidb/api/v1/srp-reports/${reportUuid}/milestones`,
    data,
  })
    .then(createSuccessHandler({ title: 'Success!', body: 'Additional information request created successfully.' }))
    .catch(createCatchHandler('Error creating additional information request:'));
}
