import type { App } from 'vue';

import { flushPromises } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';

import { useFlawModel } from '@/composables/useFlawModel';
import { useAegisMetadataTracking } from '@/composables/aegis/useAegisMetadataTracking';

import sampleFlawFull from '@/__tests__/__fixtures__/sampleFlawFull.json';
import sampleFlawRequired from '@/__tests__/__fixtures__/sampleFlawRequired.json';
import { withSetup, router } from '@/__tests__/helpers';
import type { ZodFlawType, ZodAffectType } from '@/types';
import { postFlaw, putFlaw } from '@/services/FlawService';
import { deepCopyFromRaw } from '@/utils/helpers';

import { useFlaw } from '../useFlaw';
import { useAffectsModel } from '../useAffectsModel';

vi.mock('@/composables/useFlawCommentsModel', () => ({
  useFlawCommentsModel: vi.fn(),
}));

vi.mock('@/composables/useFlawAttributionsModel', () => ({
  useFlawAttributionsModel: vi.fn(),
}));

const sendProgrammaticFeedbackMock = vi.fn();
vi.mock('@/services/AegisAIService', () => ({
  AegisAIService: vi.fn().mockImplementation(() => ({
    sendProgrammaticFeedback: sendProgrammaticFeedbackMock,
  })),
}));

vi.mock('@/services/FlawService', () => ({
  getFlawBugzillaLink: vi.fn().mockResolvedValue({}),
  getFlawOsimLink: vi.fn().mockResolvedValue({}),
  postFlaw: vi.fn().mockResolvedValue({}),
  putFlaw: vi.fn().mockResolvedValue({}),
  putFlawCvssScores: vi.fn().mockResolvedValue({}),
  deleteFlawCvssScores: vi.fn().mockResolvedValue({}),
}));

describe('useFlawModel', () => {
  let app: App;
  const { resetFlaw: globalResetFlaw } = useFlaw();
  const { initializeAffects } = useAffectsModel().actions;

  const mountFlawModel = () => {
    const pinia = createTestingPinia();
    const plugins = [router, pinia];
    const [composable, _app] = withSetup(() => useFlawModel(), plugins);
    app = _app;
    return composable;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    globalResetFlaw();
    initializeAffects([]); // Reset affects to empty array
  });

  afterEach(() => {
    app?.unmount();
  });

  it('initializes with correct default values', () => {
    const { isSaving, isValid, shouldCreateJiraTask } = mountFlawModel();

    expect(isSaving.value).toBe(false);
    expect(isValid()).toBe(false);
    expect(shouldCreateJiraTask.value).toBe(false);
  });

  it('computes errors correctly', () => {
    const { errors } = mountFlawModel();

    expect(errors.value).toEqual(expect.objectContaining({
      comment_zero: expect.any(String),
      components: expect.any(String),
      impact: expect.any(String),
      source: expect.any(String),
      title: expect.any(String),
      unembargo_dt: expect.any(String),
    }));
  });

  it('calls onSaveSuccess and resets isSaving in afterSaveSuccess', () => {
    const { afterSaveSuccess, isSaving } = mountFlawModel();

    isSaving.value = true;
    afterSaveSuccess();

    expect(isSaving.value).toBe(false);
  });

  describe('saveFlaw', () => {
    it('should prevent creating if not valid', () => {
      const { createFlaw } = mountFlawModel();

      createFlaw();

      expect(postFlaw).not.toHaveBeenCalled();
    });

    it('should prevent updating if not valid', () => {
      const { updateFlaw } = mountFlawModel();

      updateFlaw();

      expect(putFlaw).not.toHaveBeenCalled();
    });

    it('should call postFlaw on createFlaw', () => {
      const { flaw } = useFlaw();
      flaw.value = sampleFlawRequired as ZodFlawType;
      const { createFlaw } = mountFlawModel();

      createFlaw();

      expect(postFlaw).toHaveBeenCalled();
    });

    it('should call putFlaw on updateFlaw', async () => {
      const { flaw } = useFlaw();
      flaw.value = sampleFlawFull as ZodFlawType;
      const { updateFlaw } = mountFlawModel();
      flaw.value.title = 'altered';
      await flushPromises();
      await updateFlaw();
      expect(putFlaw).toHaveBeenCalled();
    });

    it('should prevent saving if CVSS scores are invalid', async () => {
      const { setFlaw } = useFlaw();
      setFlaw(deepCopyFromRaw(sampleFlawFull as ZodFlawType));
      const { updateFlaw, updateVector } = mountFlawModel();

      updateVector('not valid');
      await flushPromises();
      await updateFlaw();

      expect(putFlaw).not.toHaveBeenCalled();
    });

    it('should call putFlaw when `shouldCreateJiraTask` is true', async () => {
      const { flaw } = useFlaw();
      flaw.value = sampleFlawFull as ZodFlawType;
      const { shouldCreateJiraTask, updateFlaw } = mountFlawModel();

      shouldCreateJiraTask.value = true;
      await flushPromises();
      await updateFlaw();

      expect(putFlaw).toHaveBeenCalled();
    });
  });

  describe('affect validation', () => {
    it('should reflect affect changes in validation', () => {
      const { flaw, setFlaw } = useFlaw();
      const flawData = deepCopyFromRaw(sampleFlawFull as ZodFlawType);

      const affectWithInvalidPurl: ZodAffectType = {
        ...flawData.affects[0],
        purl: 'pkg:oci/namespace/image@1.0.0',
      };

      flawData.affects = [affectWithInvalidPurl];
      setFlaw(flawData);

      const { isValid } = mountFlawModel();
      const { initializeAffects } = useAffectsModel().actions;
      const { currentAffects } = useAffectsModel().state;

      initializeAffects(flaw.value.affects);

      expect(isValid()).toBe(false);

      const updatedAffect = {
        ...currentAffects.value[0],
        purl: 'pkg:oci/image@1.0.0',
      };
      currentAffects.value[0] = updatedAffect;

      expect(isValid()).toBe(true);
    });

    it('should validate with currentAffects, not flaw.value.affects', () => {
      const { flaw, setFlaw } = useFlaw();
      const flawData = deepCopyFromRaw(sampleFlawFull as ZodFlawType);

      const affectWithValidPurl: ZodAffectType = {
        ...flawData.affects[0],
        purl: 'pkg:rpm/redhat/kernel@5.14.0',
      };

      flawData.affects = [affectWithValidPurl];
      setFlaw(flawData);

      const { isValid } = mountFlawModel();
      const { initializeAffects } = useAffectsModel().actions;
      const { currentAffects } = useAffectsModel().state;

      initializeAffects(flaw.value.affects);

      expect(isValid()).toBe(true);

      currentAffects.value[0] = {
        ...currentAffects.value[0],
        purl: 'pkg:oci/namespace/image@1.0.0',
      };

      expect(isValid()).toBe(false);

      expect(flaw.value.affects[0].purl).toBe('pkg:rpm/redhat/kernel@5.14.0');
      expect(currentAffects.value[0].purl).toBe('pkg:oci/namespace/image@1.0.0');
    });
  });

  describe('maybeReportProgrammaticFeedback', () => {
    const { setAegisMetadata } = useAegisMetadataTracking();

    beforeEach(() => {
      setAegisMetadata({});
    });

    it('should send feedback for AI type changes', async () => {
      const { flaw } = useFlaw();
      // Use direct assignment (not setFlaw) to avoid syncing initialFlaw
      flaw.value = deepCopyFromRaw(sampleFlawFull as ZodFlawType);

      const { updateFlaw } = mountFlawModel();

      // Set up AI metadata and change value AFTER mounting (like existing tests)
      setAegisMetadata({
        cwe_id: [{
          type: 'AI',
          timestamp: new Date().toISOString(),
          value: 'CWE-79',
        }],
      });

      // Change the field value (simulates user accepting suggestion)
      flaw.value.cwe_id = 'CWE-79';
      flaw.value.title = 'altered title';

      await flushPromises();
      await updateFlaw();

      expect(putFlaw).toHaveBeenCalled();
      expect(sendProgrammaticFeedbackMock).toHaveBeenCalledWith({
        feature: 'suggest-cwe',
        cveId: 'CVE-2024-1234',
        email: expect.any(String),
        suggested_value: 'CWE-79',
        submitted_value: 'CWE-79',
      });
    });

    it('should send feedback for Partial AI type changes', async () => {
      const { flaw } = useFlaw();
      // Use direct assignment (not setFlaw) to avoid syncing initialFlaw
      flaw.value = deepCopyFromRaw(sampleFlawFull as ZodFlawType);

      const { updateFlaw } = mountFlawModel();

      // Set up Partial AI metadata (user modified the suggestion)
      setAegisMetadata({
        cwe_id: [{
          type: 'Partial AI',
          timestamp: new Date().toISOString(),
          value: 'CWE-79 (modified)',
        }],
      });

      // Change the field value and title to ensure isFlawUpdated is true
      flaw.value.cwe_id = 'CWE-79 (modified)';
      flaw.value.title = 'altered title';

      await flushPromises();
      await updateFlaw();

      expect(putFlaw).toHaveBeenCalled();
      expect(sendProgrammaticFeedbackMock).toHaveBeenCalledWith({
        feature: 'suggest-cwe',
        cveId: 'CVE-2024-1234',
        email: expect.any(String),
        suggested_value: 'CWE-79 (modified)',
        submitted_value: 'CWE-79 (modified)',
      });
    });

    it('should not send feedback when aegis metadata is empty', async () => {
      const { flaw } = useFlaw();
      flaw.value = deepCopyFromRaw(sampleFlawFull as ZodFlawType);
      setAegisMetadata({});

      flaw.value.title = 'changed title';

      const { updateFlaw } = mountFlawModel();
      await flushPromises();
      await updateFlaw();

      expect(sendProgrammaticFeedbackMock).not.toHaveBeenCalled();
    });

    it('should not send feedback when CVE ID is missing', async () => {
      const { flaw } = useFlaw();
      const flawData = deepCopyFromRaw(sampleFlawFull as ZodFlawType);
      flawData.cve_id = null;
      flaw.value = flawData;

      setAegisMetadata({
        cwe_id: [{
          type: 'AI',
          timestamp: new Date().toISOString(),
          value: 'CWE-79',
        }],
      });

      flaw.value.cwe_id = 'CWE-79';

      const { updateFlaw } = mountFlawModel();
      await flushPromises();
      await updateFlaw();

      expect(sendProgrammaticFeedbackMock).not.toHaveBeenCalled();
    });

    it('should not send feedback when field value has not changed from initial', async () => {
      const { flaw, setFlaw } = useFlaw();
      const flawData = deepCopyFromRaw(sampleFlawFull as ZodFlawType);
      flawData.cwe_id = 'CWE-79'; // Same as suggestion
      // Use setFlaw to sync initialFlaw with flaw (both have CWE-79)
      setFlaw(flawData);

      setAegisMetadata({
        cwe_id: [{
          type: 'AI',
          timestamp: new Date().toISOString(),
          value: 'CWE-79',
        }],
      });

      // Need to trigger an update by changing something else
      flaw.value.title = 'changed title';

      const { updateFlaw } = mountFlawModel();
      await flushPromises();
      await updateFlaw();

      // cwe_id feedback should not be sent because flaw.cwe_id === initialFlaw.cwe_id
      expect(sendProgrammaticFeedbackMock).not.toHaveBeenCalled();
    });

    it('should use the most recent change by timestamp when multiple exist', async () => {
      const { flaw } = useFlaw();
      flaw.value = deepCopyFromRaw(sampleFlawFull as ZodFlawType);

      const { updateFlaw } = mountFlawModel();

      const oldTimestamp = new Date('2024-01-01T00:00:00Z').toISOString();
      const newTimestamp = new Date('2024-01-02T00:00:00Z').toISOString();

      // Set up metadata with multiple entries (AI first, then Partial AI)
      setAegisMetadata({
        impact: [
          {
            type: 'AI',
            timestamp: oldTimestamp,
            value: 'LOW',
          },
          {
            type: 'Partial AI',
            timestamp: newTimestamp,
            value: 'MODERATE',
          },
        ],
      });

      // Change impact and title to ensure isFlawUpdated is true
      flaw.value.impact = 'MODERATE';
      flaw.value.title = 'altered title';

      await flushPromises();
      await updateFlaw();

      // Should use the most recent (Partial AI with MODERATE)
      expect(putFlaw).toHaveBeenCalled();
      expect(sendProgrammaticFeedbackMock).toHaveBeenCalledWith({
        feature: 'suggest-impact',
        cveId: 'CVE-2024-1234',
        email: expect.any(String),
        suggested_value: 'MODERATE',
        submitted_value: 'MODERATE',
      });
    });

    it('should skip fields without a mapped feature name', async () => {
      const { flaw } = useFlaw();
      flaw.value = deepCopyFromRaw(sampleFlawFull as ZodFlawType);

      // Set up metadata for a field that doesn't have a feature mapping
      setAegisMetadata({
        unknown_field: [{
          type: 'AI',
          timestamp: new Date().toISOString(),
          value: 'some value',
        }],
      });

      flaw.value.title = 'changed';

      const { updateFlaw } = mountFlawModel();
      await flushPromises();
      await updateFlaw();

      expect(sendProgrammaticFeedbackMock).not.toHaveBeenCalled();
    });

    it('should skip changes that are neither AI nor Partial AI type', async () => {
      const { flaw } = useFlaw();
      flaw.value = deepCopyFromRaw(sampleFlawFull as ZodFlawType);

      setAegisMetadata({
        cwe_id: [{
          type: 'Manual' as any,
          timestamp: new Date().toISOString(),
          value: 'CWE-79',
        }],
      });

      flaw.value.cwe_id = 'CWE-79';

      const { updateFlaw } = mountFlawModel();
      await flushPromises();
      await updateFlaw();

      expect(sendProgrammaticFeedbackMock).not.toHaveBeenCalled();
    });
  });
});
