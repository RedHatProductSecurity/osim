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

function assertLabelUuid(
  label: ZodFlawLabelType,
  action: 'deleting' | 'updating',
): asserts label is { uuid: string } & ZodFlawLabelType {
  if (!label.uuid) {
    createCatchHandler(`Error ${action} label ${label.name}`)(new Error(`Label ${label.name} is missing a UUID`));
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
  assertLabelUuid(label, 'deleting');

  return osidbFetch({
    method: 'delete',
    url: `/osidb/api/v2/flaws/${flawUUID}/labels/${label.uuid}`,
  })
    .then(createSuccessHandler({ title: 'Success!', body: `Label ${label.name} deleted.` }))
    .catch(createCatchHandler(`Error deleting label ${label.name}`));
}

export async function updateLabel(flawUUID: string, label: ZodFlawLabelType) {
  assertLabelUuid(label, 'updating');

  return osidbFetch({
    method: 'put',
    url: `/osidb/api/v2/flaws/${flawUUID}/labels/${label.uuid}`,
    data: label,
  })
    .then(createSuccessHandler({ title: 'Success!', body: `Label ${label.name} updated.` }))
    .catch(createCatchHandler(`Error updating label ${label.name}`));
}
