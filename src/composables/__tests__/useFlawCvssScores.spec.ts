import { osimFullFlawTest, osimEmptyFlawTest } from '@/components/__tests__/test-suite-helpers';

import { IssuerEnum } from '@/generated-client';
import { putFlawCvssScores } from '@/services/FlawService';
import type { ZodFlawType } from '@/types';

import { useMockFlawWithModules } from './helpers';

vi.mock('@/services/FlawService');

const useMockedModel = async (flaw: ZodFlawType) => await useMockFlawWithModules(flaw, vi)({
  useFlaw: '@/composables/useFlaw',
  useCvss4Calculator: '@/composables/useCvss4Calculator',
  useFlawCvssScores: '@/composables/useFlawCvssScores',
});

describe('useFlawCvssScores', () => {
  osimFullFlawTest('should return an object', async ({ flaw }) => {
    const { useFlawCvssScores } = await useMockedModel(flaw);
    const composable = useFlawCvssScores();
    expect(composable).toBeInstanceOf(Object);
    expect(Object.keys(composable)).toHaveLength(13);
  });

  describe('shouldDisplayEmailNistForm', () => {
    osimEmptyFlawTest('should be false when flaw does not have scores', async ({ flaw }) => {
      const { useFlawCvssScores } = await useMockedModel(flaw);
      const { shouldDisplayEmailNistForm } = useFlawCvssScores();

      expect(shouldDisplayEmailNistForm.value).toBeFalsy();
    });

    osimFullFlawTest('should be true when flaw has different scores', async ({ flaw }) => {
      const { useFlawCvssScores } = await useMockedModel(flaw);
      const { shouldDisplayEmailNistForm } = useFlawCvssScores();

      expect(shouldDisplayEmailNistForm.value).toBeTruthy();
    });

    osimFullFlawTest('should be false when flaw has the same scores and no comment', async ({ flaw }) => {
      flaw.cvss_scores[0].comment = '';
      flaw.cvss_scores[1] = { ...flaw.cvss_scores[0], issuer: IssuerEnum.Nist };
      const { useFlawCvssScores } = await useMockedModel(flaw);
      const { shouldDisplayEmailNistForm } = useFlawCvssScores();

      expect(shouldDisplayEmailNistForm.value).toBeFalsy();
    });

    osimFullFlawTest('should be true when scores have comments', async ({ flaw }) => {
      flaw.cvss_scores[1] = { ...flaw.cvss_scores[0], issuer: IssuerEnum.Nist };
      flaw.cvss_scores[0].comment = 'This is a comment';
      const { useFlawCvssScores } = await useMockedModel(flaw);
      const { shouldDisplayEmailNistForm } = useFlawCvssScores();

      expect(shouldDisplayEmailNistForm.value).toBeTruthy();
    });
  });

  osimFullFlawTest('should match flaw embargo status', async ({ flaw }) => {
    flaw.cvss_scores.forEach(score => score.embargoed = true);
    flaw.embargoed = false;
    const { useFlawCvssScores } = await useMockedModel(flaw);
    const { saveCvssScores } = useFlawCvssScores();

    saveCvssScores();

    expect(vi.mocked(putFlawCvssScores))
      .toHaveBeenCalledWith(flaw.uuid, flaw.cvss_scores[0].uuid, expect.objectContaining({ embargoed: false }));
  });
});
