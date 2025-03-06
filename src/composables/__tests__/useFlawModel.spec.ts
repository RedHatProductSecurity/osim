import type { App } from 'vue';

import { flushPromises } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import sampleFlawFull from '@test-fixtures/sampleFlawFull.json';
import sampleFlawRequired from '@test-fixtures/sampleFlawRequired.json';

import { useCvssScores } from '@/composables/useCvssScores';
import { useFlawModel } from '@/composables/useFlawModel';
import { blankFlaw, useFlaw } from '@/composables/useFlaw';

import { withSetup, router } from '@/__tests__/helpers';
import type { ZodFlawType } from '@/types';
import { putFlaw, postFlaw } from '@/services/FlawService';

vi.mock('@/services/FlawService', () => ({
  postFlaw: vi.fn().mockResolvedValue({}),
  putFlaw: vi.fn().mockResolvedValue({}),
}));

vi.mock('@/composables/useCvssScores');
vi.mock('@/composables/useFlaw', async (importOriginal) => {
  const { ref } = await import('vue');
  const flaw = (await import('@test-fixtures/sampleFlawFull.json')).default;
  return {
    ...await importOriginal(),
    useFlaw: vi.fn().mockReturnValue({ flaw: ref(flaw) }),
  };
});

describe('useFlawModel', () => {
  let app: App;
  const onSaveSuccess = vi.fn();

  const mountFlawModel = () => {
    const pinia = createTestingPinia();
    const plugins = [router, pinia];
    const [composable, _app] = withSetup(() => useFlawModel(onSaveSuccess), plugins);
    app = _app;
    return composable;
  };

  beforeEach(() => {
    vi.resetAllMocks();
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

    expect(onSaveSuccess).toHaveBeenCalled();
    expect(isSaving.value).toBe(false);
  });

  describe('saveFlaw', () => {
    it('should prevent creating if not valid', async () => {
      const { createFlaw } = await mountFlawModel();

      createFlaw();

      expect(postFlaw).not.toHaveBeenCalled();
    });

    it('should prevent updating if not valid', async () => {
      const { updateFlaw } = await mountFlawModel();

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
      const { flaw } = useFlaw();
      const { updateFlaw, updateVector } = mountFlawModel();
      flaw.value = sampleFlawFull as ZodFlawType;
      await flushPromises();
      updateVector('not valid');
      await flushPromises();
      updateFlaw();

      expect(putFlaw).not.toHaveBeenCalled();
    });
  });
});
