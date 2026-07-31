import { createCatchHandler } from '@/composables/service-helpers';

import { useToastStore } from '@/stores/ToastStore';

vi.mock('@/stores/ToastStore', () => ({
  useToastStore: vi.fn(),
}));

describe('createCatchHandler', () => {
  const addToast = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToastStore).mockReturnValue({ addToast } as any);
  });

  it('shows mid-air collision message on 409', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const handler = createCatchHandler('Could not update Flaw', false);

    handler({
      response: {
        status: 409,
        statusText: 'Conflict',
        data: { detail: 'updated_dt mismatch' },
      },
    });

    expect(addToast).toHaveBeenCalledWith({
      title: 'Mid-air collision detected',
      body: 'This entity was modified by someone else. Reload to see the latest changes, then re-apply your edits.',
      css: 'warning',
    });
  });
});
