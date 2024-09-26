import { ref, type Ref } from 'vue';

import { flushPromises } from '@vue/test-utils';

import { affects } from '@/components/__tests__/__fixtures__/sampleFlawFull.json';

import { useTrackers } from '@/composables/useTrackers';

import { affectResolutions, type ZodAffectType } from '@/types/zodAffect';
import { fileTrackingFor, getTrackersForFlaws } from '@/services/TrackerService';

vi.mock('@/services/TrackerService', () => ({
  getTrackersForFlaws: vi.fn(),
  fileTrackingFor: vi.fn(),
}));

describe('useTrackers', () => {
  const flawUuid = 'test-flaw-uuid';
  let affectsRef: Ref<ZodAffectType[]>;

  beforeEach(() => {
    affectsRef = ref(structuredClone(affects as ZodAffectType[]));
  });

  it('initializes correctly', () => {
    vi.mocked(getTrackersForFlaws).mockResolvedValue({ modules_components: [] });
    const result = useTrackers(flawUuid, affectsRef);

    expect(result).toBeTypeOf('object');
    expect(Object.keys(result)).toEqual([
      'fileTrackers',
      'getUpdateStreamsFor',
      'alreadyFiledTrackers',
      'availableUpdateStreams',
      'untrackableAffects',
      'trackerSelections',
      'trackersToFile',
      'setAllTrackerSelections',
      'updateTrackerSelections',
      'sortedStreams',
      'unselectedStreams',
      'selectedStreams',
      'filterString',
      'isFilingTrackers',
      'isLoadingTrackers',
    ]);
  });

  it('loads trackers on mount', async () => {
    vi.mocked(getTrackersForFlaws).mockResolvedValue({ modules_components: [] });
    useTrackers(flawUuid, affectsRef);

    expect(getTrackersForFlaws).toHaveBeenCalledTimes(1);
  });

  it('files trackers correctly', async () => {
    vi.mocked(fileTrackingFor).mockResolvedValue({ successes: [] });
    const { fileTrackers, isFilingTrackers } = useTrackers(flawUuid, affectsRef);
    await fileTrackers();
    expect(isFilingTrackers.value).toBe(false);
  });

  it('computes selectedStreams correctly', () => {
    const { selectedStreams } = useTrackers(flawUuid, affectsRef);
    expect(selectedStreams.value.length).toBe(0);
  });

  it('computes untrackableAffects correctly', () => {
    const { untrackableAffects } = useTrackers(flawUuid, affectsRef);
    expect(untrackableAffects.value.length).toBe(0);
  });

  it('computes availableUpdateStreams correctly', async () => {
    vi.mocked(getTrackersForFlaws).mockResolvedValue({ modules_components: [
      {
        affect: {
          uuid: 'test-affect-uuid',
          resolution: affectResolutions.Delegated,
        },
        ps_component: 'test-component',
        ps_module: 'test-module',
        affectUuid: 'test-affect-uuid',
        streams: [{
          selected: false,
        }],
      },
    ] });
    const { availableUpdateStreams } = useTrackers(flawUuid, affectsRef);

    await flushPromises();

    expect(availableUpdateStreams.value).toEqual([{
      affectUuid: 'test-affect-uuid',
      ps_component: 'test-component',
      ps_module: 'test-module',
      selected: false,
    }]);
  });
});
