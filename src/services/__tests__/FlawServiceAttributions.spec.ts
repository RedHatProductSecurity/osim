import { createCatchHandler, createSuccessHandler } from '@/composables/service-helpers';

import {
  deleteFlawAcknowledgment,
  deleteFlawReference,
  putFlawAcknowledgment,
  putFlawReference,
} from '@/services/FlawService';
import { osidbFetch } from '@/services/OsidbAuthService';

vi.mock('@/services/OsidbAuthService', () => ({ osidbFetch: vi.fn() }));

vi.mock('@/composables/service-helpers', () => ({
  createSuccessHandler: vi.fn().mockReturnValue(vi.fn()),
  createCatchHandler: vi.fn().mockReturnValue(vi.fn()),
}));

const referenceBody = {
  description: 'desc',
  type: 'EXTERNAL',
  url: 'https://example.com',
  embargoed: false,
  updated_dt: '2024-01-01T00:00:00Z',
};

const acknowledgmentBody = {
  name: 'name',
  affiliation: 'affiliation',
  from_upstream: false,
  embargoed: false,
  updated_dt: '2024-01-01T00:00:00Z',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('putFlawReference', () => {
  it('updates through the reference endpoint and toasts the success', async () => {
    const response = { data: { uuid: 'ref-1' } };
    vi.mocked(osidbFetch).mockResolvedValue(response as any);

    await expect(putFlawReference('flaw-1', 'ref-1', referenceBody as any)).resolves.toBe(response);

    expect(osidbFetch).toHaveBeenCalledWith({
      method: 'put',
      url: '/osidb/api/v1/flaws/flaw-1/references/ref-1',
      data: referenceBody,
    });
    expect(createSuccessHandler).toHaveBeenCalledWith({ title: 'Success!', body: 'Reference updated.' });
    expect(createCatchHandler).not.toHaveBeenCalled();
  });

  it('leaves a suppressed 409 to the conflict handler without toasting', async () => {
    const conflict = { response: { status: 409 } };
    vi.mocked(osidbFetch).mockRejectedValue(conflict);

    await expect(putFlawReference('flaw-1', 'ref-1', referenceBody as any, { suppressConflictToast: true }))
      .rejects.toBe(conflict);

    expect(createCatchHandler).not.toHaveBeenCalled();
    expect(createSuccessHandler).not.toHaveBeenCalled();
  });

  it('leaves a suppressed 404 to the conflict handler without toasting', async () => {
    const missing = { response: { status: 404 } };
    vi.mocked(osidbFetch).mockRejectedValue(missing);

    await expect(putFlawReference('flaw-1', 'ref-1', referenceBody as any, { suppressConflictToast: true }))
      .rejects.toBe(missing);

    expect(createCatchHandler).not.toHaveBeenCalled();
  });

  it('toasts an unsuppressed 409', async () => {
    const conflict = { response: { status: 409 } };
    vi.mocked(osidbFetch).mockRejectedValue(conflict);

    await expect(putFlawReference('flaw-1', 'ref-1', referenceBody as any)).rejects.toBe(conflict);

    expect(createCatchHandler).toHaveBeenCalledWith('Error updating Reference:', false);
  });

  it('toasts other failures even when conflicts are suppressed', async () => {
    const failure = { response: { status: 500 } };
    vi.mocked(osidbFetch).mockRejectedValue(failure);

    await expect(putFlawReference('flaw-1', 'ref-1', referenceBody as any, { suppressConflictToast: true }))
      .rejects.toBe(failure);

    expect(createCatchHandler).toHaveBeenCalledWith('Error updating Reference:', false);
  });
});

describe('putFlawAcknowledgment', () => {
  it('updates through the acknowledgment endpoint and toasts the success', async () => {
    const response = { data: { uuid: 'ack-1' } };
    vi.mocked(osidbFetch).mockResolvedValue(response as any);

    await expect(putFlawAcknowledgment('flaw-1', 'ack-1', acknowledgmentBody as any)).resolves.toBe(response);

    expect(osidbFetch).toHaveBeenCalledWith({
      method: 'put',
      url: '/osidb/api/v1/flaws/flaw-1/acknowledgments/ack-1',
      data: acknowledgmentBody,
    });
    expect(createSuccessHandler).toHaveBeenCalledWith({ title: 'Success!', body: 'Acknowledgment updated.' });
  });

  it('leaves a suppressed 409 to the conflict handler without toasting', async () => {
    const conflict = { response: { status: 409 } };
    vi.mocked(osidbFetch).mockRejectedValue(conflict);

    await expect(putFlawAcknowledgment('flaw-1', 'ack-1', acknowledgmentBody as any, { suppressConflictToast: true }))
      .rejects.toBe(conflict);

    expect(createCatchHandler).not.toHaveBeenCalled();
  });

  it('toasts an unsuppressed conflict', async () => {
    const conflict = { response: { status: 409 } };
    vi.mocked(osidbFetch).mockRejectedValue(conflict);

    await expect(putFlawAcknowledgment('flaw-1', 'ack-1', acknowledgmentBody as any)).rejects.toBe(conflict);

    expect(createCatchHandler).toHaveBeenCalledWith('Error updating Acknowledgment:', false);
  });
});

describe('deleteFlawReference', () => {
  it('deletes through the reference endpoint and toasts the success', async () => {
    vi.mocked(osidbFetch).mockResolvedValue({ data: undefined } as any);

    await deleteFlawReference('flaw-1', 'ref-1');

    expect(osidbFetch).toHaveBeenCalledWith({
      method: 'delete',
      url: '/osidb/api/v1/flaws/flaw-1/references/ref-1',
    });
    expect(createSuccessHandler).toHaveBeenCalledWith({ title: 'Success!', body: 'Reference deleted.' });
  });

  it('leaves a suppressed error to the caller without toasting', async () => {
    const missing = { response: { status: 404 } };
    vi.mocked(osidbFetch).mockRejectedValue(missing);

    await expect(deleteFlawReference('flaw-1', 'ref-1', { suppressErrorToast: true })).rejects.toBe(missing);

    expect(createCatchHandler).not.toHaveBeenCalled();
  });

  it('toasts an unsuppressed error', async () => {
    const failure = { response: { status: 500 } };
    vi.mocked(osidbFetch).mockRejectedValue(failure);

    await expect(deleteFlawReference('flaw-1', 'ref-1')).rejects.toBe(failure);

    expect(createCatchHandler).toHaveBeenCalledWith('Error deleting Reference:', false);
  });
});

describe('deleteFlawAcknowledgment', () => {
  it('deletes through the acknowledgment endpoint and toasts the success', async () => {
    vi.mocked(osidbFetch).mockResolvedValue({ data: undefined } as any);

    await deleteFlawAcknowledgment('flaw-1', 'ack-1');

    expect(osidbFetch).toHaveBeenCalledWith({
      method: 'delete',
      url: '/osidb/api/v1/flaws/flaw-1/acknowledgments/ack-1',
    });
    expect(createSuccessHandler).toHaveBeenCalledWith({ title: 'Success!', body: 'Acknowledgment deleted.' });
  });

  it('leaves a suppressed error to the caller without toasting', async () => {
    const missing = { response: { status: 404 } };
    vi.mocked(osidbFetch).mockRejectedValue(missing);

    await expect(deleteFlawAcknowledgment('flaw-1', 'ack-1', { suppressErrorToast: true })).rejects.toBe(missing);

    expect(createCatchHandler).not.toHaveBeenCalled();
  });
});
