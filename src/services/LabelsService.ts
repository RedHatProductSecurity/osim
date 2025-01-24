import { createCatchHandler, createSuccessHandler } from '@/composables/service-helpers';

import type { PaginatedFlawLabelList } from '@/generated-client';
import type { ZodFlawLabelType } from '@/types/zodFlaw';

import { osidbFetch } from './OsidbAuthService';

export async function fetchLabels() {
  try {
    const { data }: { data: PaginatedFlawLabelList } = await osidbFetch({
      method: 'get',
      url: '/osidb/api/v1/labels',
    });

    return data.results;
  } catch (error) {
    console.error('LabelService::fetchLabels() Error fetching labels', error);
    return [];
  }
}

export async function createLabel(flawUUID: string, label: ZodFlawLabelType) {
  return osidbFetch({
    method: 'post',
    url: `/osidb/api/v1/flaws/${flawUUID}/labels`,
    data: label,
  })
    .then(createSuccessHandler({ title: 'Success!', body: `Label ${label.label} created.` }))
    .catch(createCatchHandler(`Error creating label ${label.label}`));
}

export async function deleteLabel(flawUUID: string, label: ZodFlawLabelType) {
  return osidbFetch({
    method: 'delete',
    url: `/osidb/api/v1/flaws/${flawUUID}/labels/${label.uuid}`,
  })
    .then(createSuccessHandler({ title: 'Success!', body: `Label ${label.label} deleted.` }))
    .catch(createCatchHandler(`Error deleting label ${label.label}`));
}

export async function updateLabel(flawUUID: string, label: ZodFlawLabelType) {
  return osidbFetch({
    method: 'put',
    url: `/osidb/api/v1/flaws/${flawUUID}/labels/${label.uuid}`,
    data: label,
  })
    .then(createSuccessHandler({ title: 'Success!', body: `Label ${label.label} updated.` }))
    .catch(createCatchHandler(`Error updating label ${label.label}`));
}
