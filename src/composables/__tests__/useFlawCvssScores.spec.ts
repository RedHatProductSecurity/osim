import { osimFullFlawTest } from '@/components/__tests__/test-suite-helpers';

import { useFlawCvssScores } from '@/composables/useFlawCvssScores';
import { useFlaw } from '@/composables/useFlaw';
import { useCvss4Calculator } from '@/composables/useCvss4Calculator';

import { IssuerEnum } from '@/generated-client';
import { putFlawCvssScores } from '@/services/FlawService';

vi.mock('@/services/FlawService');
vi.mock('@/composables/useFlaw');
vi.mock('@/composables/useCvss3Calculator');
vi.mock('@/composables/useCvss4Calculator');

type UseFlawDynamicImport = typeof import('@/composables/useFlaw');
// type UseCvss3CalculatorDynamicImport = typeof import('@/composables/useCvss3Calculator');
type UseCvss4CalculatorDynamicImport = typeof import('@/composables/useCvss4Calculator');

describe('useFlawCvssScores', () => {
  // @ts-expect-error  flaw not defined
  beforeEach(async ({ flaw }) => {
    vi.resetModules();
    vi.clearAllMocks();
    const { useFlaw: _useFlaw } = await vi.importActual<UseFlawDynamicImport>('@/composables/useFlaw');
    // const { useCvss3Calculator: _useCvss3Calculator } =
    // await vi.importActual<UseCvss3CalculatorDynamicImport>('@/composables/useCvss3Calculator');
    const mockedUseFlaw = _useFlaw();
    mockedUseFlaw.flaw.value = flaw;
    vi.mocked(useFlaw).mockReturnValue(mockedUseFlaw);
    const { useCvss4Calculator: _useCvss4Calculator } =
      await vi.importActual<UseCvss4CalculatorDynamicImport>('@/composables/useCvss4Calculator');
    vi.mocked(useCvss4Calculator).mockReturnValue(_useCvss4Calculator());
  });

  osimFullFlawTest('should return an object', ({ flaw }) => {
    const cvssScore = useFlawCvssScores();

    expect(cvssScore).toBeInstanceOf(Object);
    expect(Object.keys(cvssScore)).toHaveLength(7);
  });

  describe('shouldDisplayEmailNistForm', () => {
    it('should be false when flaw does not have scores', () => {
      const { shouldDisplayEmailNistForm } = useFlawCvssScores();

      expect(shouldDisplayEmailNistForm.value).toBeFalsy();
    });

    osimFullFlawTest('should be true when flaw has different scores', ({ flaw }) => {
      const { shouldDisplayEmailNistForm } = useFlawCvssScores();

      expect(shouldDisplayEmailNistForm.value).toBeTruthy();
    });

    osimFullFlawTest('should be false when flaw has the same scores and no comment', ({ flaw }) => {
      flaw.cvss_scores[0].comment = '';
      flaw.cvss_scores[1] = { ...flaw.cvss_scores[0], issuer: IssuerEnum.Nist };

      const { shouldDisplayEmailNistForm } = useFlawCvssScores();

      expect(shouldDisplayEmailNistForm.value).toBeFalsy();
    });

    osimFullFlawTest('should be true when scores have comments', ({ flaw }) => {
      flaw.cvss_scores[1] = { ...flaw.cvss_scores[0], issuer: IssuerEnum.Nist };
      flaw.cvss_scores[0].comment = 'This is a comment';

      const { shouldDisplayEmailNistForm } = useFlawCvssScores();

      expect(shouldDisplayEmailNistForm.value).toBeTruthy();
    });
  });

  osimFullFlawTest('should match flaw embargo status', ({ flaw }) => {
    flaw.cvss_scores.forEach(score => score.embargoed = true);
    flaw.embargoed = false;
    const { saveCvssScores } = useFlawCvssScores();

    saveCvssScores();

    expect(vi.mocked(putFlawCvssScores))
      .toHaveBeenCalledWith(flaw.uuid, flaw.cvss_scores[0].uuid, expect.objectContaining({ embargoed: false }));
  });
});
