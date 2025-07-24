import { osimFullFlawTest, osimEmptyFlawTest } from '@/components/__tests__/test-suite-helpers';

import { useFlaw } from '@/composables/useFlaw';
import { useCvssScores } from '@/composables/useCvssScores';

import { IssuerEnum } from '@/generated-client';
import { putFlawCvssScores } from '@/services/FlawService';
import type { ZodFlawType } from '@/types';
import { importActual, withSetup } from '@/__tests__/helpers';

vi.mock('@/services/FlawService');
vi.mock('@/composables/useCvssScores');
vi.mock('@/composables/useFlaw', async (importOriginal) => {
  const { ref } = await import('vue');
  const flaw = (await import('@test-fixtures/sampleFlawFull.json')).default;
  return {
    ...await importOriginal(),
    useFlaw: vi.fn().mockReturnValue({ flaw: ref(flaw) }),
  };
});
const composeCvssScoresWith = (flaw: ZodFlawType) => {
  const [composable] = withSetup(async () => {
    const { useFlaw: _useFlaw } = await importActual('@/composables/useFlaw');
    _useFlaw().flaw.value = flaw;
    vi.mocked(useFlaw).mockReturnValue(_useFlaw());
    const { useCvssScores: _useCvssScores } = await importActual('@/composables/useCvssScores');
    const mockedModel = _useCvssScores();
    vi.mocked(useCvssScores).mockReturnValue(mockedModel);
    return mockedModel;
  }, []);
  return composable;
};
describe('useCvssScores', () => {
  describe('shouldDisplayEmailNistForm', () => {
    osimEmptyFlawTest('should be false when flaw does not have scores', async ({ flaw }) => {
      const { shouldDisplayEmailNistForm } = await composeCvssScoresWith(flaw);

      expect(shouldDisplayEmailNistForm.value).toBeFalsy();
    });

    osimFullFlawTest('should be true when flaw has different scores', async ({ flaw }) => {
      const { shouldDisplayEmailNistForm } = await composeCvssScoresWith(flaw);

      expect(shouldDisplayEmailNistForm.value).toBeTruthy();
    });

    osimFullFlawTest('should be false when flaw has the same scores and no comment', async ({ flaw }) => {
      flaw.cvss_scores[0].comment = '';
      flaw.cvss_scores[1] = { ...flaw.cvss_scores[0], issuer: IssuerEnum.Nist };
      const { shouldDisplayEmailNistForm } = await composeCvssScoresWith(flaw);

      expect(shouldDisplayEmailNistForm.value).toBeFalsy();
    });

    osimFullFlawTest('should be true when scores have comments', async ({ flaw }) => {
      flaw.cvss_scores[1] = { ...flaw.cvss_scores[0], issuer: IssuerEnum.Nist };
      flaw.cvss_scores[0].comment = 'This is a comment';
      const { shouldDisplayEmailNistForm } = await composeCvssScoresWith(flaw);

      expect(shouldDisplayEmailNistForm.value).toBeTruthy();
    });
  });

  osimFullFlawTest('should match flaw embargo status', async ({ flaw }) => {
    flaw.cvss_scores.forEach(score => score.embargoed = true);
    flaw.embargoed = false;
    const { saveCvssScores } = await composeCvssScoresWith(flaw);

    saveCvssScores();

    expect(vi.mocked(putFlawCvssScores))
      .toHaveBeenCalledWith(flaw.uuid, flaw.cvss_scores[0].uuid, expect.objectContaining({ embargoed: false }));
  });
});
