import { flushPromises } from '@vue/test-utils';

import { getFlaws } from '@/services/FlawService';

import { useFlawsFetching } from '../useFlawsFetching';

vi.mock('@/services/FlawService', () => ({
  getFlaws: vi.fn(),
}));

describe('useFlawsFetching', () => {
  const mockIusses = Array.from({ length: 30 }).fill({ id: 1, name: 'Flaw 1' });
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('loads flaws', async () => {
    vi.mocked(getFlaws).mockResolvedValue({
      data: { results: mockIusses.slice(0, 20), total: 30, next: null },
    });

    const { isFinalPageFetched, isLoading, issues, loadFlaws } = useFlawsFetching();

    expect(isLoading.value).toBe(false);

    loadFlaws();

    expect(isLoading.value).toBe(true);
    await flushPromises();

    expect(getFlaws).toHaveBeenCalledOnce();
    expect(isLoading.value).toBe(false);
    expect(issues.value.length).toBe(20);
    expect(isFinalPageFetched.value).toBe(true);
  });

  it('loading more flaws', async () => {
    vi.mocked(getFlaws).mockResolvedValueOnce({
      data:
      {
        results: mockIusses.slice(0, 20),
        count: 30,
        next: 'https://osidb-stage.prodsec.redhat.com/osidb/api/v1/flaws?offset=20',
      },
    }).mockResolvedValueOnce({
      data:
      {
        results: mockIusses.slice(20),
        count: 30,
        next: null,
      },
    });

    const { isLoading, issues, loadFlaws, loadMoreFlaws, total } = useFlawsFetching();

    loadFlaws();
    await flushPromises();

    loadMoreFlaws();
    await flushPromises();

    expect(getFlaws).toHaveBeenCalledTimes(2);
    expect(isLoading.value).toBe(false);
    expect(issues.value.length).toBe(mockIusses.length);
    expect(total.value).toBe(30);
  });

  it('should not loading more flaws', async () => {
    vi.mocked(getFlaws).mockResolvedValueOnce({
      data: {
        results: mockIusses.slice(0, 10),
        count: 10,
        next: null,
      },
    });

    const { isLoading, issues, loadFlaws, loadMoreFlaws, total } = useFlawsFetching();

    loadFlaws();
    await flushPromises();

    loadMoreFlaws();
    await flushPromises();

    expect(getFlaws).toHaveBeenCalledTimes(1);
    expect(isLoading.value).toBe(false);
    expect(issues.value.length).toBe(10);
    expect(total.value).toBe(10);
  });
});
