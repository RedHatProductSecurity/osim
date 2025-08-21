import type { App } from 'vue';

import { flushPromises } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';

import { useFlawModel } from '@/composables/useFlawModel';

import sampleFlawFull from '@/__tests__/__fixtures__/sampleFlawFull.json';
import sampleFlawRequired from '@/__tests__/__fixtures__/sampleFlawRequired.json';
import { withSetup, router } from '@/__tests__/helpers';
import type { ZodFlawType } from '@/types';
import { postFlaw, putFlaw } from '@/services/FlawService';

import { useFlaw } from '../useFlaw';

vi.mock('@/composables/useFlawCommentsModel', () => ({
  useFlawCommentsModel: vi.fn(),
}));

vi.mock('@/composables/useFlawAttributionsModel', () => ({
  useFlawAttributionsModel: vi.fn(),
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

  const mountFlawModel = () => {
    const pinia = createTestingPinia();
    const plugins = [router, pinia];
    const [composable, _app] = withSetup(() => useFlawModel(), plugins);
    app = _app;
    return composable;
  };

  beforeEach(() => {
    vi.clearAllMocks();
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
      setFlaw(sampleFlawFull as ZodFlawType);
      const { updateFlaw, updateVector } = mountFlawModel();
      updateVector('not valid');
      await flushPromises();
      updateFlaw();

      expect(putFlaw).not.toHaveBeenCalled();
    });
  });
});
