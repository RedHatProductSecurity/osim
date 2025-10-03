import { ref } from 'vue';

import { flushPromises } from '@vue/test-utils';

import type { ZodAffectType, ZodFlawType } from '@/types';
import { useToastStore } from '@/stores/ToastStore';
import { getAffects } from '@/services/AffectService';

import { useMultiFlawTrackers } from '../useMultiFlawTrackers';
import { useFlaw } from '../useFlaw';

vi.mock('@/services/AffectService', () => ({
  getAffects: vi.fn(),
}));

vi.mock('../useFlaw');
vi.mock('@/stores/ToastStore');
vi.mock('@/services/osidb-errors-helpers', () => ({
  parseOsidbErrors: vi.fn(error => error.message || 'Error occurred'),
}));

describe('useMultiFlawTrackers', () => {
  const defaultMockFlaw: ZodFlawType = {
    uuid: 'flaw-uuid-1',
    cve_id: 'CVE-2024-0001',
    affects: [
      {
        uuid: 'affect-uuid-1',
        ps_component: 'component-1',
        ps_update_stream: 'stream-1',
        tracker: null,
      } as ZodAffectType,
      {
        uuid: 'affect-uuid-2',
        ps_component: 'component-2',
        ps_update_stream: 'stream-2',
        tracker: null,
      } as ZodAffectType,
    ],
  } as ZodFlawType;

  // Create a reactive reference for the mock flaw that can be updated in tests
  const mockFlawRef = ref<ZodFlawType>(defaultMockFlaw);

  const mockAffectsForCVE2: ZodAffectType[] = [
    {
      uuid: 'affect-uuid-3',
      cve_id: 'CVE-2024-0002',
      flaw: 'flaw-uuid-2',
      ps_component: 'component-1',
      ps_module: 'module-1',
      ps_update_stream: 'stream-1',
      tracker: null,
      embargoed: false,
      alerts: [],
      cvss_scores: [],
      trackers: [],
      labels: [],
    } as ZodAffectType,
    {
      uuid: 'affect-uuid-4',
      cve_id: 'CVE-2024-0002',
      flaw: 'flaw-uuid-2',
      ps_component: 'component-3',
      ps_module: 'module-3',
      ps_update_stream: 'stream-3',
      tracker: null,
      embargoed: false,
      alerts: [],
      cvss_scores: [],
      trackers: [],
      labels: [],

    } as ZodAffectType,
  ];

  const mockAffectsForCVE3: ZodAffectType[] = [
    {
      uuid: 'affect-uuid-5',
      cve_id: 'CVE-2024-0003',
      flaw: 'flaw-uuid-3',
      ps_component: 'component-1',
      ps_module: 'module-1',
      ps_update_stream: 'stream-1',
      tracker: null,
      embargoed: false,
      alerts: [],
      cvss_scores: [],
      trackers: [],
      labels: [],
    } as ZodAffectType,
  ];

  let addToastMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    addToastMock = vi.fn();

    // Reset to default mock flaw
    mockFlawRef.value = defaultMockFlaw;

    (useFlaw as any).mockReturnValue({
      flaw: mockFlawRef,
    });

    (useToastStore as any).mockReturnValue({
      addToast: addToastMock,
    });
  });

  afterEach(() => {
    // Clear the composable state after each test
    const { state } = useMultiFlawTrackers();
    state.relatedAffects.clear();
  });

  describe('validateId', () => {
    it('should validate valid CVE ID', () => {
      const { actions } = useMultiFlawTrackers();
      expect(actions.validateId('CVE-2024-1234')).toBe(true);
    });

    it('should validate valid UUID v4', () => {
      const { actions } = useMultiFlawTrackers();
      expect(actions.validateId('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    });

    it('should reject invalid CVE format', () => {
      const { actions } = useMultiFlawTrackers();
      expect(actions.validateId('CVE-2024-0000')).toBe(false); // All zeros
      expect(actions.validateId('CVE-1998-1234')).toBe(false); // Before 1999
      expect(actions.validateId('invalid-cve')).toBe(false);
    });

    it('should reject invalid UUID format', () => {
      const { actions } = useMultiFlawTrackers();
      expect(actions.validateId('not-a-uuid')).toBe(false);
      expect(actions.validateId('550e8400-e29b-31d4-a716-446655440000')).toBe(false); // UUID v3
    });
  });

  describe('addFlaw', () => {
    it('should add flaw with valid CVE ID', async () => {
      (getAffects as any).mockResolvedValue({
        data: { results: mockAffectsForCVE2 },
        response: {} as Response,
      });

      const { actions, state } = useMultiFlawTrackers();

      expect(state.relatedAffects.has('CVE-2024-0002')).toBe(false);

      actions.addFlaw('CVE-2024-0002');

      // Should set to loading immediately
      expect(state.relatedAffects.get('CVE-2024-0002')).toBe('loading');

      await flushPromises();

      // Should update to data after API call
      expect(getAffects).toHaveBeenCalledWith('CVE-2024-0002');
      expect(state.relatedAffects.get('CVE-2024-0002')).toEqual(mockAffectsForCVE2);
    });

    it('should add flaw with valid UUID', async () => {
      (getAffects as any).mockResolvedValue({
        data: { results: mockAffectsForCVE3 },
        response: {} as Response,
      });

      const { actions, state } = useMultiFlawTrackers();

      actions.addFlaw('550e8400-e29b-41d4-a716-446655440000');

      expect(state.relatedAffects.get('550e8400-e29b-41d4-a716-446655440000')).toBe('loading');

      await flushPromises();

      expect(getAffects).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440000');
      expect(state.relatedAffects.get('550e8400-e29b-41d4-a716-446655440000')).toEqual(mockAffectsForCVE3);
    });

    it('should not add flaw with invalid identifier', () => {
      const { actions, state } = useMultiFlawTrackers();

      actions.addFlaw('invalid-id');

      expect(state.relatedAffects.size).toBe(0);
      expect(getAffects).not.toHaveBeenCalled();
    });

    it('should not add duplicate flaw', () => {
      const { actions, state } = useMultiFlawTrackers();

      state.relatedAffects.set('CVE-2024-0002', mockAffectsForCVE2);

      actions.addFlaw('CVE-2024-0002');

      expect(getAffects).not.toHaveBeenCalled();
      expect(state.relatedAffects.get('CVE-2024-0002')).toEqual(mockAffectsForCVE2);
    });

    it('should handle API error and set error state', async () => {
      const mockError = new Error('API Error');
      (getAffects as any).mockRejectedValue(mockError);

      const { actions, state } = useMultiFlawTrackers();

      actions.addFlaw('CVE-2024-0002');

      expect(state.relatedAffects.get('CVE-2024-0002')).toBe('loading');

      await flushPromises();

      expect(state.relatedAffects.get('CVE-2024-0002')).toBe('error');
      expect(addToastMock).toHaveBeenCalledWith({
        body: expect.any(String),
        title: 'Failed to load CVE-2024-0002',
        css: 'warning',
      });
    });

    it('should handle errors correctly even with concurrent requests', async () => {
      (getAffects as any)
        .mockResolvedValueOnce({
          data: { results: mockAffectsForCVE2 },
          response: {} as Response,
        })
        .mockRejectedValueOnce(new Error('Second call failed'));

      const { actions, state } = useMultiFlawTrackers();

      // Add two flaws concurrently
      actions.addFlaw('CVE-2024-0002');
      actions.addFlaw('CVE-2024-0003');

      await flushPromises();

      expect(state.relatedAffects.get('CVE-2024-0002')).toEqual(mockAffectsForCVE2);
      expect(state.relatedAffects.get('CVE-2024-0003')).toBe('error');
    });
  });

  describe('removeFlaw', () => {
    it('should remove flaw from relatedAffects', () => {
      const { actions, state } = useMultiFlawTrackers();

      state.relatedAffects.set('CVE-2024-0002', mockAffectsForCVE2);
      expect(state.relatedAffects.has('CVE-2024-0002')).toBe(true);

      actions.removeFlaw('CVE-2024-0002');

      expect(state.relatedAffects.has('CVE-2024-0002')).toBe(false);
    });

    it('should handle removing non-existent flaw gracefully', () => {
      const { actions, state } = useMultiFlawTrackers();

      expect(state.relatedAffects.size).toBe(0);

      // Should not throw
      actions.removeFlaw('CVE-2024-9999');

      expect(state.relatedAffects.size).toBe(0);
    });
  });

  describe('currentFlawStreamMap', () => {
    it('should create map of stream keys to affect UUIDs', () => {
      const { computed } = useMultiFlawTrackers();

      const streamMap = computed.currentFlawStreamMap.value;

      expect(streamMap.get('stream-1:component-1')).toBe('affect-uuid-1');
      expect(streamMap.get('stream-2:component-2')).toBe('affect-uuid-2');
      expect(streamMap.size).toBe(2);
    });

    it('should only include affects without trackers', () => {
      const flawWithTrackers: ZodFlawType = {
        ...defaultMockFlaw,
        affects: [
          {
            uuid: 'affect-with-tracker',
            ps_component: 'component-1',
            ps_module: 'module-1',
            ps_update_stream: 'stream-1',
            tracker: { external_system_id: 'JIRA-123' }, // Has a tracker
            embargoed: false,
            alerts: [],
            cvss_scores: [],
            trackers: [],
          } as unknown as ZodAffectType,
          {
            uuid: 'affect-without-tracker',
            ps_component: 'component-2',
            ps_module: 'module-2',
            ps_update_stream: 'stream-2',
            tracker: null,
            embargoed: false,
            alerts: [],
            cvss_scores: [],
            trackers: [],
          } as unknown as ZodAffectType,
        ],
      } as ZodFlawType;

      mockFlawRef.value = flawWithTrackers;

      const { computed } = useMultiFlawTrackers();
      const streamMap = computed.currentFlawStreamMap.value;

      expect(streamMap.has('stream-1:component-1')).toBe(false);
      expect(streamMap.get('stream-2:component-2')).toBe('affect-without-tracker');
      expect(streamMap.size).toBe(1);
    });

    it('should skip affects without UUID', () => {
      const flawWithoutUuid: ZodFlawType = {
        ...defaultMockFlaw,
        affects: [
          {
            uuid: null,
            ps_component: 'component-1',
            ps_update_stream: 'stream-1',
            tracker: null,
          } as any,
        ],
      } as ZodFlawType;

      mockFlawRef.value = flawWithoutUuid;

      const { computed } = useMultiFlawTrackers();
      const streamMap = computed.currentFlawStreamMap.value;

      expect(streamMap.size).toBe(0);
    });
  });

  describe('sharedStreams', () => {
    it('should identify shared streams between current flaw and related flaws', () => {
      const { computed, state } = useMultiFlawTrackers();

      state.relatedAffects.set('CVE-2024-0002', mockAffectsForCVE2);

      const sharedStreams = computed.sharedStreams.value;

      // stream-1:component-1 is shared between current flaw and CVE-2024-0002
      expect(sharedStreams['stream-1:component-1']).toEqual([
        'affect-uuid-1', // Current flaw
        'affect-uuid-3', // CVE-2024-0002
      ]);
    });

    it('should not include streams not in current flaw', () => {
      const { computed, state } = useMultiFlawTrackers();

      state.relatedAffects.set('CVE-2024-0002', mockAffectsForCVE2);

      const sharedStreams = computed.sharedStreams.value;

      // stream-3:component-3 is only in CVE-2024-0002, not in current flaw
      expect(sharedStreams['stream-3:component-3']).toBeUndefined();
    });

    it('should handle multiple related flaws on same stream', () => {
      const { computed, state } = useMultiFlawTrackers();

      state.relatedAffects.set('CVE-2024-0002', mockAffectsForCVE2);
      state.relatedAffects.set('CVE-2024-0003', mockAffectsForCVE3);

      const sharedStreams = computed.sharedStreams.value;

      // stream-1:component-1 is shared by all three flaws
      expect(sharedStreams['stream-1:component-1']).toEqual([
        'affect-uuid-1', // Current flaw
        'affect-uuid-3', // CVE-2024-0002
        'affect-uuid-5', // CVE-2024-0003
      ]);
    });

    it('should skip loading and error states', () => {
      const { computed, state } = useMultiFlawTrackers();

      state.relatedAffects.set('CVE-2024-0002', 'loading');
      state.relatedAffects.set('CVE-2024-0003', 'error');

      const sharedStreams = computed.sharedStreams.value;

      expect(Object.keys(sharedStreams).length).toBe(0);
    });
  });

  describe('streamToCveMap', () => {
    it('should map streams to CVE IDs', () => {
      const { computed, state } = useMultiFlawTrackers();

      state.relatedAffects.set('CVE-2024-0002', mockAffectsForCVE2);

      const streamToCveMap = computed.streamToCveMap.value;

      expect(streamToCveMap['stream-1:component-1']).toContain('CVE-2024-0001'); // Current flaw
      expect(streamToCveMap['stream-1:component-1']).toContain('CVE-2024-0002'); // Related flaw
    });

    it('should use flaw UUID if cve_id is not available', () => {
      const flawWithoutCveId: ZodFlawType = {
        ...defaultMockFlaw,
        cve_id: null,
      } as any;

      mockFlawRef.value = flawWithoutCveId;

      const { computed, state } = useMultiFlawTrackers();

      state.relatedAffects.set('CVE-2024-0002', mockAffectsForCVE2);

      const streamToCveMap = computed.streamToCveMap.value;

      expect(streamToCveMap['stream-1:component-1']).toContain('flaw-uuid-1'); // Current flaw UUID
      expect(streamToCveMap['stream-1:component-1']).toContain('CVE-2024-0002'); // Related flaw
    });

    it('should use affect flaw UUID if affect cve_id is not available', () => {
      const affectsWithoutCveId: ZodAffectType[] = [
        {
          uuid: 'affect-uuid-3',
          cve_id: null,
          flaw: 'flaw-uuid-2',
          ps_component: 'component-1',
          ps_module: 'module-1',
          ps_update_stream: 'stream-1',
          tracker: null,
          embargoed: false,
          alerts: [],
          cvss_scores: [],
          trackers: [],
          labels: [],
        } as ZodAffectType,
      ];

      const { computed, state } = useMultiFlawTrackers();

      state.relatedAffects.set('flaw-uuid-2', affectsWithoutCveId);

      const streamToCveMap = computed.streamToCveMap.value;

      expect(streamToCveMap['stream-1:component-1']).toContain('CVE-2024-0001'); // Current flaw
      expect(streamToCveMap['stream-1:component-1']).toContain('flaw-uuid-2'); // Related affect's flaw
    });
  });

  describe('cveStreamCount', () => {
    it('should count streams per CVE', () => {
      const { computed, state } = useMultiFlawTrackers();

      state.relatedAffects.set('CVE-2024-0002', mockAffectsForCVE2);

      const cveStreamCount = computed.cveStreamCount.value;

      // CVE-2024-0002 has 2 affects, but only 1 is on a stream shared with current flaw
      expect(cveStreamCount['CVE-2024-0002']).toBe(1);
    });

    it('should count streams for multiple CVEs', () => {
      const { computed, state } = useMultiFlawTrackers();

      state.relatedAffects.set('CVE-2024-0002', mockAffectsForCVE2);
      state.relatedAffects.set('CVE-2024-0003', mockAffectsForCVE3);

      const cveStreamCount = computed.cveStreamCount.value;

      expect(cveStreamCount['CVE-2024-0002']).toBe(1);
      expect(cveStreamCount['CVE-2024-0003']).toBe(1);
    });

    it('should only count streams that exist in current flaw', () => {
      const affectsOnNonMatchingStream: ZodAffectType[] = [
        {
          uuid: 'affect-uuid-6',
          cve_id: 'CVE-2024-0004',
          flaw: 'flaw-uuid-4',
          ps_component: 'component-99',
          ps_module: 'module-99',
          ps_update_stream: 'stream-99',
          tracker: null,
          embargoed: false,
          alerts: [],
          cvss_scores: [],
          trackers: [],
          labels: [],
        } as ZodAffectType,
      ];

      const { computed, state } = useMultiFlawTrackers();

      state.relatedAffects.set('CVE-2024-0004', affectsOnNonMatchingStream);

      const cveStreamCount = computed.cveStreamCount.value;

      // CVE-2024-0004 has no shared streams with current flaw
      expect(cveStreamCount['CVE-2024-0004']).toBeUndefined();
    });
  });

  describe('getRelatedCvesForAffect', () => {
    it('should return related CVEs for an affect', () => {
      const { actions, state } = useMultiFlawTrackers();

      state.relatedAffects.set('CVE-2024-0002', mockAffectsForCVE2);

      const relatedCves = actions.getRelatedCvesForAffect(defaultMockFlaw.affects[0]);

      expect(relatedCves).toContain('CVE-2024-0002');
      expect(relatedCves).not.toContain('CVE-2024-0001'); // Current flaw's CVE excluded
    });

    it('should return empty array when no related CVEs', () => {
      const { actions } = useMultiFlawTrackers();

      const relatedCves = actions.getRelatedCvesForAffect(defaultMockFlaw.affects[0]);

      expect(relatedCves).toEqual([]);
    });

    it('should exclude current flaw UUID when it has no CVE ID', () => {
      const flawWithoutCveId: ZodFlawType = {
        ...defaultMockFlaw,
        cve_id: null,
      } as any;

      mockFlawRef.value = flawWithoutCveId;

      const { actions, state } = useMultiFlawTrackers();

      state.relatedAffects.set('CVE-2024-0002', mockAffectsForCVE2);

      const relatedCves = actions.getRelatedCvesForAffect(flawWithoutCveId.affects[0]);

      expect(relatedCves).toContain('CVE-2024-0002');
      expect(relatedCves).not.toContain('flaw-uuid-1'); // Current flaw's UUID excluded
    });

    it('should return multiple related CVEs on same stream', () => {
      const { actions, state } = useMultiFlawTrackers();

      state.relatedAffects.set('CVE-2024-0002', mockAffectsForCVE2);
      state.relatedAffects.set('CVE-2024-0003', mockAffectsForCVE3);

      const relatedCves = actions.getRelatedCvesForAffect(defaultMockFlaw.affects[0]);

      expect(relatedCves).toContain('CVE-2024-0002');
      expect(relatedCves).toContain('CVE-2024-0003');
      expect(relatedCves.length).toBe(2);
    });
  });

  describe('getAffectUuidsForStream', () => {
    it('should return affect UUIDs for a shared stream', () => {
      const { actions, state } = useMultiFlawTrackers();

      state.relatedAffects.set('CVE-2024-0002', mockAffectsForCVE2);

      const affectUuids = actions.getAffectUuidsForStream('stream-1:component-1');

      expect(affectUuids).toContain('affect-uuid-1'); // Current flaw
      expect(affectUuids).toContain('affect-uuid-3'); // CVE-2024-0002
    });

    it('should return empty array for unknown stream', () => {
      const { actions } = useMultiFlawTrackers();

      const affectUuids = actions.getAffectUuidsForStream('unknown-stream:unknown-component');

      expect(affectUuids).toEqual([]);
    });

    it('should return empty array for non-shared stream', () => {
      const { actions, state } = useMultiFlawTrackers();

      state.relatedAffects.set('CVE-2024-0002', mockAffectsForCVE2);

      // stream-3 is only in CVE-2024-0002, not in current flaw
      const affectUuids = actions.getAffectUuidsForStream('stream-3:component-3');

      expect(affectUuids).toEqual([]);
    });
  });
});
