import { createTestingPinia } from '@pinia/testing';
import { http, HttpResponse } from 'msw';

import { server } from '@/__tests__/setup';
import { FlawLabelTypeEnum, type ZodFlawLabelType } from '@/types/zodFlaw';
import { StateEnum } from '@/generated-client';
import { osimRuntime } from '@/stores/osimRuntime';
import { handlers } from '@/mock-server/handlers';

import { createLabel, deleteLabel, fetchLabels, updateLabel } from '../LabelsService';

vi.mock('@/composables/service-helpers');

describe('labelsService', () => {
  beforeAll(() => {
    createTestingPinia();
    server.use(...handlers);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should retrieve labels', async () => {
    const labels = await fetchLabels();

    expect(labels).toBeDefined();
    expect(Array.isArray(labels)).toBeTruthy();
  });

  it('can create a label', async () => {
    const flawUUID = '123';
    const label: ZodFlawLabelType = {
      label: 'test create',
      state: StateEnum.New,
      type: FlawLabelTypeEnum.CONTEXT_BASED,
      relevant: true,
      contributor: '',
    };

    await expect(createLabel(flawUUID, label)).resolves.not.toBeUndefined();
  });

  it('can update a label', async () => {
    const flawUUID = '123';
    const label: ZodFlawLabelType = {
      label: 'test update',
      state: StateEnum.New,
      type: FlawLabelTypeEnum.CONTEXT_BASED,
      relevant: true,
      contributor: '',
    };

    await expect(updateLabel(flawUUID, label)).resolves.not.toBeUndefined();
  });

  it('can delete a label', async () => {
    const flawUUID = '123';
    const label: ZodFlawLabelType = {
      label: 'test delete',
      state: StateEnum.New,
      type: FlawLabelTypeEnum.CONTEXT_BASED,
      relevant: true,
      contributor: '',
    };

    await expect(deleteLabel(flawUUID, label)).resolves.not.toBeUndefined();
  });

  it('handles errors when creating a label', async () => {
    const flawUUID = '123';
    const label: ZodFlawLabelType = {
      label: 'test error',
      state: StateEnum.New,
      type: FlawLabelTypeEnum.CONTEXT_BASED,
      relevant: true,
      contributor: '',
    };

    server.use(
      http.post(
        `${osimRuntime.value.backends.osidb}/osidb/api/v1/flaws/${flawUUID}/labels`, () => {
          return HttpResponse.text('Error', { status: 500 });
        },
        { once: true },
      ),
    );

    await expect(() => createLabel(flawUUID, label)).rejects.toThrow();
  });

  it('handles errors when updating a label', async () => {
    const flawUUID = '123';
    const label: ZodFlawLabelType = {
      label: 'test error',
      state: StateEnum.New,
      type: FlawLabelTypeEnum.CONTEXT_BASED,
      relevant: true,
      contributor: '',
    };

    server.use(
      http.put(
        `${osimRuntime.value.backends.osidb}/osidb/api/v1/flaws/${flawUUID}/labels/${label.uuid}`, () => {
          return HttpResponse.text('Error', { status: 500 });
        },
        { once: true },
      ),
    );

    await expect(() => updateLabel(flawUUID, label)).rejects.toThrow();
  });

  it('handles errors when deleting a label', async () => {
    const flawUUID = '123';
    const label: ZodFlawLabelType = {
      label: 'test error',
      state: StateEnum.New,
      type: FlawLabelTypeEnum.CONTEXT_BASED,
      relevant: true,
      contributor: '',
    };

    server.use(
      http.delete(
        `${osimRuntime.value.backends.osidb}/osidb/api/v1/flaws/${flawUUID}/labels/${label.uuid}`, () => {
          return HttpResponse.text('Error', { status: 500 });
        },
        { once: true },
      ),
    );

    await expect(() => deleteLabel(flawUUID, label)).rejects.toThrow();
  });
});
