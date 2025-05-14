import type { App } from 'vue';

import { flushPromises } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import sampleFlawFull from '@test-fixtures/sampleFlawFull.json';
import sampleFlawRequired from '@test-fixtures/sampleFlawRequired.json';

import { useCvssScores } from '@/composables/useCvssScores';
import { useFlawModel } from '@/composables/useFlawModel';
import { blankFlaw, useFlaw } from '@/composables/useFlaw';

import { withSetup, importActual } from '@/__tests__/helpers';
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

  const mountFlawModel = (flaw: ZodFlawType = blankFlaw()) => {
    const pinia = createTestingPinia();
    const [composable, _app] = withSetup(async () => {
      const { useFlaw: _useFlaw } = await importActual('@/composables/useFlaw');
      _useFlaw().flaw.value = flaw;
      vi.mocked(useFlaw).mockReturnValue(_useFlaw());
      const { useCvssScores: _useCvssScores } = await importActual('@/composables/useCvssScores');
      vi.mocked(useCvssScores).mockReturnValue(_useCvssScores());
      const flawModel = useFlawModel(flaw, () => {});
      return flawModel;
    }, [pinia]);
    app = _app;
    return composable;
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    app?.unmount();
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

    it('should call postFlaw on createFlaw', async () => {
      const { createFlaw } = await mountFlawModel(sampleFlawRequired as ZodFlawType);

      createFlaw();

      expect(postFlaw).toHaveBeenCalled();
    });

    it('should call putFlaw on updateFlaw', async () => {
      const { flaw, updateFlaw } = await mountFlawModel(sampleFlawFull as ZodFlawType);
      flaw.value.title = 'altered';
      await flushPromises();
      await updateFlaw();

      expect(putFlaw).toHaveBeenCalled();
    });

    it('should prevent saving if CVSS scores are invalid', async () => {
      const { updateFlaw, updateVector } = await mountFlawModel(sampleFlawFull as ZodFlawType);
      updateVector('not valid');
      await flushPromises();
      updateFlaw();

      expect(putFlaw).not.toHaveBeenCalled();
    });
  });
});
