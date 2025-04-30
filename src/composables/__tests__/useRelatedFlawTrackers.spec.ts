import { ref, type Ref } from 'vue';

import { flushPromises } from '@vue/test-utils';
import sampleTrackersQueryResult from '@test-fixtures/sampleTrackersQueryResult.json';
import * as flawJson from '@test-fixtures/sampleFlawTrackers.json';

import { useRelatedFlawTrackers } from '@/composables/useRelatedFlawTrackers';

import { fileTrackingFor, getTrackersForFlaws } from '@/services/TrackerService';
import type { ZodFlawType } from '@/types';

const flaw = flawJson as ZodFlawType;

vi.mock('@/services/TrackerService', () => ({
  getTrackersForFlaws: vi.fn(),
  fileTrackingFor: vi.fn(),
}));

async function mockedTrackers(
  flaw: ZodFlawType,
  relatedFlaws: Ref<ZodFlawType[]>,
  sampleTrackers = sampleTrackersQueryResult,
) {
  await flushPromises();
  vi.mocked(getTrackersForFlaws).mockResolvedValue(sampleTrackers);
  const trackers = useRelatedFlawTrackers(flaw, relatedFlaws);
  await trackers.trackerFetchProgress;
  return trackers;
}

describe('useRelatedFlawTrackers', () => {
  const relatedFlaws = ref([flaw]);

  it('initializes correctly', () => {
    vi.mocked(getTrackersForFlaws).mockResolvedValue({ modules_components: [] });
    const result = useRelatedFlawTrackers(flaw, relatedFlaws);

    expect(result).toBeTypeOf('object');
    expect(Object.keys(result)).toEqual([
      'fileTrackers',
      'synchronizeTrackerSelections',
      'addRelatedFlaw',
      'refreshRelatedFlaws',
      'filterString',
      'isFilingTrackers',
      'trackersToFile',
      'affectsBySelectedFlawId',
      'shouldFileAsMultiFlaw',
      'multiFlawTrackers',
      'isLoadingTrackers',
      'selectedStreams',
      'unselectedStreams',
      'trackerFetchProgress',
    ]);
  });

  it('loads trackers on mount', async () => {
    vi.mocked(getTrackersForFlaws).mockResolvedValue({ modules_components: [] });
    useRelatedFlawTrackers(flaw, relatedFlaws);

    expect(getTrackersForFlaws).toHaveBeenCalledTimes(1);
  });

  it('files trackers correctly', async () => {
    vi.mocked(fileTrackingFor).mockResolvedValue({ successes: [] });
    const { fileTrackers, isFilingTrackers } = useRelatedFlawTrackers(flaw, relatedFlaws);
    await fileTrackers();
    expect(isFilingTrackers.value).toBe(false);
  });

  it('computes selectedStreams correctly', () => {
    const { selectedStreams } = useRelatedFlawTrackers(flaw, relatedFlaws);
    expect(selectedStreams.value.length).toBe(0);
  });

  it('computes unselectedStreams correctly', () => {
    const { unselectedStreams } = useRelatedFlawTrackers(flaw, relatedFlaws);
    expect(unselectedStreams.value.length).toBe(0);
  });

  it('computes untracked affects correctly', async () => {
    const { multiFlawTrackers } = await mockedTrackers(flaw, relatedFlaws);
    const untrackedAffects = Object.values(
      multiFlawTrackers.value).flatMap(({ untrackedAffects }) => untrackedAffects);
    expect(untrackedAffects.length).toBe(20);
  });

  it('computes untrackableAffects correctly', async () => {
    const { multiFlawTrackers } = await mockedTrackers(flaw, relatedFlaws);
    const untrackableAffects = Object.values(
      multiFlawTrackers.value).flatMap(({ untrackableAffects }) => untrackableAffects);
    expect(untrackableAffects.length).toBe(16);
  });

  it('computes availableUpdateStreams correctly', async () => {
    const trackers = await mockedTrackers(flaw, relatedFlaws);
    const availableUpdateStreams = Object.values(trackers.multiFlawTrackers.value).flatMap(
      ({ availableUpdateStreams }) => availableUpdateStreams);
    expect(availableUpdateStreams).toEqual(mockedOsimUpdateStreams());
  });
});

function mockedOsimUpdateStreams() {
  return [
    {
      ps_update_stream: 'rhel-br-8.10.z',
      selected: false,
      acked: true,
      eus: false,
      aus: false,
      ps_component: 'javapackages-tools:201801/junit',
      ps_module: 'rhel-br-8',
      affectUuid: '1540c450-4422-49b9-bc3d-1c16bfe379b8',
      flawCveOrId: 'CVE-2020-15250',
    },
    {
      ps_update_stream: 'rhel-br-8.6.0.z',
      selected: false,
      acked: true,
      eus: true,
      aus: false,
      ps_component: 'javapackages-tools:201801/junit',
      ps_module: 'rhel-br-8',
      affectUuid: '1540c450-4422-49b9-bc3d-1c16bfe379b8',
      flawCveOrId: 'CVE-2020-15250',
    },
    {
      ps_update_stream: 'rhel-br-8.8.0.z',
      selected: false,
      acked: true,
      eus: true,
      aus: false,
      ps_component: 'javapackages-tools:201801/junit',
      ps_module: 'rhel-br-8',
      affectUuid: '1540c450-4422-49b9-bc3d-1c16bfe379b8',
      flawCveOrId: 'CVE-2020-15250',
    },
    {
      ps_update_stream: 'rhel-br-8.2.0.z',
      selected: false,
      acked: true,
      eus: false,
      aus: true,
      ps_component: 'javapackages-tools:201801/junit',
      ps_module: 'rhel-br-8',
      affectUuid: '1540c450-4422-49b9-bc3d-1c16bfe379b8',
      flawCveOrId: 'CVE-2020-15250',
    },
    {
      ps_update_stream: 'rhel-br-8.4.0.z',
      selected: false,
      acked: true,
      eus: false,
      aus: true,
      ps_component: 'javapackages-tools:201801/junit',
      ps_module: 'rhel-br-8',
      affectUuid: '1540c450-4422-49b9-bc3d-1c16bfe379b8',
      flawCveOrId: 'CVE-2020-15250',
    },
    {
      ps_update_stream: 'rhel-br-8',
      selected: false,
      acked: false,
      eus: false,
      aus: false,
      ps_component: 'javapackages-tools:201801/junit',
      ps_module: 'rhel-br-8',
      affectUuid: '1540c450-4422-49b9-bc3d-1c16bfe379b8',
      flawCveOrId: 'CVE-2020-15250',
    },
    {
      ps_update_stream: 'rhel-8.8.0.z',
      selected: false,
      acked: true,
      eus: true,
      aus: false,
      ps_component: 'eclipse:rhel8/junit',
      ps_module: 'rhel-8',
      affectUuid: 'a45e50c3-6d3f-484d-b8a3-ffc1971a1d2f',
      flawCveOrId: 'CVE-2020-15250',
    },
    {
      ps_update_stream: 'rhel-8.6.0.z',
      selected: false,
      acked: true,
      eus: true,
      aus: false,
      ps_component: 'eclipse:rhel8/junit',
      ps_module: 'rhel-8',
      affectUuid: 'a45e50c3-6d3f-484d-b8a3-ffc1971a1d2f',
      flawCveOrId: 'CVE-2020-15250',
    },
    {
      ps_update_stream: 'rhel-8.4.0.z',
      selected: false,
      acked: true,
      eus: false,
      aus: true,
      ps_component: 'eclipse:rhel8/junit',
      ps_module: 'rhel-8',
      affectUuid: 'a45e50c3-6d3f-484d-b8a3-ffc1971a1d2f',
      flawCveOrId: 'CVE-2020-15250',
    },
    {
      ps_update_stream: 'rhel-8.2.0.z',
      selected: false,
      acked: true,
      eus: false,
      aus: true,
      ps_component: 'eclipse:rhel8/junit',
      ps_module: 'rhel-8',
      affectUuid: 'a45e50c3-6d3f-484d-b8a3-ffc1971a1d2f',
      flawCveOrId: 'CVE-2020-15250',
    },
    {
      ps_update_stream: 'rhel-8.10.z',
      selected: false,
      acked: true,
      eus: false,
      aus: false,
      ps_component: 'eclipse:rhel8/junit',
      ps_module: 'rhel-8',
      affectUuid: 'a45e50c3-6d3f-484d-b8a3-ffc1971a1d2f',
      flawCveOrId: 'CVE-2020-15250',
    },
    {
      ps_update_stream: 'fuse-7-els-1',
      selected: false,
      acked: true,
      eus: false,
      aus: false,
      ps_component: 'junit4',
      ps_module: 'fuse-7',
      affectUuid: 'a5cfd8ff-b12d-4408-9309-607785551faf',
      flawCveOrId: 'CVE-2020-15250',
    },
  ];
}
