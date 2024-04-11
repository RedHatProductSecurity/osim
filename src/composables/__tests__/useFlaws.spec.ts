import { getFlaws } from '@/services/FlawService';
import { useFlaws } from '../useFlaws';
import { flushPromises } from '@vue/test-utils';

vi.mock('@/services/FlawService', () => ({
  getFlaws: vi.fn(),
}));

describe('useFlaws', () => {
  const mockIusses = new Array(30).fill({ id: 1, name: 'Flaw 1' });
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('loads flaws', async () => {
    vi.mocked(getFlaws).mockResolvedValue({
      data: { results: mockIusses.slice(0,20), total: 30, next:null },
    });

    const { loadFlaws, issues, isLoading, isFinalPageFetched } = useFlaws();

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
        results: mockIusses.slice(0,20), 
        total: 30,
        next: 'https://osidb-stage.prodsec.redhat.com/osidb/api/v1/flaws?offset=20',
      }, 
    }).mockResolvedValueOnce({
      data: 
      { 
        results: mockIusses.slice(20),
        total: 30,
        next: null
      },
    });

    const { loadFlaws, loadMoreFlaws, issues, isLoading } = useFlaws();

    loadFlaws();
    await flushPromises();

    loadMoreFlaws();
    await flushPromises(); 

    expect(getFlaws).toHaveBeenCalledTimes(2);
    expect(isLoading.value).toBe(false);
    expect(issues.value.length).toBe(mockIusses.length); 
  });

  it('should not loading more flaws', async () => {
    vi.mocked(getFlaws).mockResolvedValueOnce({
      data: { 
        results: mockIusses.slice(0,10), 
        total: 10,
        next: null
      },
    });

    const { loadFlaws, loadMoreFlaws, issues, isLoading } = useFlaws();

    loadFlaws();
    await flushPromises();

    loadMoreFlaws();
    await flushPromises(); 

    expect(getFlaws).toHaveBeenCalledTimes(1);
    expect(isLoading.value).toBe(false);
    expect(issues.value.length).toBe(10); 
  });

});
