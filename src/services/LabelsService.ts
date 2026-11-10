import { createCatchHandler, createSuccessHandler } from '@/composables/service-helpers';

import type { PaginatedFlawLabelList } from '@/generated-client';
import { FlawLabelTypeEnum, type ZodFlawLabelType } from '@/types/zodFlaw';

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
    url: `/osidb/api/v2/flaws/${flawUUID}/labels`,
    data: label,
  })
    .then(createSuccessHandler({ title: 'Success!', body: `Label ${label.name} created.` }))
    .catch(createCatchHandler(`Error creating label ${label.name}`));
}

export async function deleteLabel(flawUUID: string, label: ZodFlawLabelType) {
  if (!label.uuid) {
    return Promise.reject(new Error(`Label ${label.name} is missing a UUID`))
      .catch(createCatchHandler(`Error deleting label ${label.name}`));
  }

  return osidbFetch({
    method: 'delete',
    url: `/osidb/api/v2/flaws/${flawUUID}/labels/${label.uuid}`,
  })
    .then(createSuccessHandler({ title: 'Success!', body: `Label ${label.name} deleted.` }))
    .catch(createCatchHandler(`Error deleting label ${label.name}`));
}

function labelUpdatePayload(label: ZodFlawLabelType) {
  // Affects can change a BU label's state after the page loads. OSIDB rejects
  // the update when any field other than the contributor differs from the current row.
  if (label.type === FlawLabelTypeEnum.BU) {
    return {
      name: label.name,
      contributor: label.contributor ?? '',
    };
  }

  return label;
}

export async function updateLabel(flawUUID: string, label: ZodFlawLabelType) {
  if (!label.uuid) {
    return Promise.reject(new Error(`Label ${label.name} is missing a UUID`))
      .catch(createCatchHandler(`Error updating label ${label.name}`));
  }

  return osidbFetch({
    method: 'put',
    url: `/osidb/api/v2/flaws/${flawUUID}/labels/${label.uuid}`,
    data: labelUpdatePayload(label),
  })
    .then(createSuccessHandler({ title: 'Success!', body: `Label ${label.name} updated.` }))
    .catch(createCatchHandler(`Error updating label ${label.name}`));
}
