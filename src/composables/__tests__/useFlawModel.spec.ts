import type { App } from 'vue';

import { flushPromises } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';

import { useFlawModel } from '@/composables/useFlawModel';
import { blankFlaw } from '@/composables/useFlaw';

import sampleFlawFull from '@/__tests__/__fixtures__/sampleFlawFull.json';
import sampleFlawRequired from '@/__tests__/__fixtures__/sampleFlawRequired.json';
import { withSetup, router } from '@/__tests__/helpers';
import type { ZodFlawType } from '@/types';
import { putFlaw, postFlaw } from '@/services/FlawService';

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
  postFlawCvssScores: vi.fn().mockResolvedValue({}),
}));

describe('useFlawModel', () => {
  const onSaveSuccess = vi.fn();
  let app: App;

  const mountFlawModel = (flaw: ZodFlawType = blankFlaw()) => {
    const pinia = createTestingPinia();
    const plugins = [router, pinia];
    const [composable, _app] = withSetup(() => useFlawModel(flaw, onSaveSuccess), plugins);
    app = _app;
    return composable;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    app?.unmount();
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
      const { createFlaw } = mountFlawModel(sampleFlawRequired as ZodFlawType);

      createFlaw();

      expect(postFlaw).toHaveBeenCalled();
    });

    it('should call putFlaw on updateFlaw', async () => {
      const { flaw, updateFlaw } = mountFlawModel(sampleFlawFull as ZodFlawType);
      flaw.value.title = 'altered';
      await flushPromises();
      await updateFlaw();

      expect(putFlaw).toHaveBeenCalled();
    });

    it('should prevent saving if CVSS scores are invalid', async () => {
      await flushPromises();
      const { flaw, flawRhCvss, updateFlaw, updateVector } = mountFlawModel(sampleFlawFull as ZodFlawType);
      updateVector('not valid');
      flaw.value.cvss_scores[0].vector = 'not valid';
      console.log('flawRhCvss');
      updateFlaw();

      expect(putFlaw).not.toHaveBeenCalled();
    });
  });
});
