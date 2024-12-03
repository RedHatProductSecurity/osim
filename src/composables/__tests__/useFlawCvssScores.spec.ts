import { ref } from 'vue';

import { osimFullFlawTest } from '@/components/__tests__/test-suite-helpers';

import { useFlawCvssScores } from '@/composables/useFlawCvssScores';
import { blankFlaw } from '@/composables/useFlaw';

import { IssuerEnum } from '@/generated-client';

describe('useFlawCvssScores', () => {
  osimFullFlawTest('should return an object', ({ flaw }) => {
    const cvssScore = useFlawCvssScores(ref(flaw));

    expect(cvssScore).toBeInstanceOf(Object);
    expect(Object.keys(cvssScore)).toHaveLength(7);
  });

  describe('shouldDisplayEmailNistForm', () => {
    it('should be false when flaw does not have scores', () => {
      const { shouldDisplayEmailNistForm } = useFlawCvssScores(ref(blankFlaw()));

      expect(shouldDisplayEmailNistForm.value).toBeFalsy();
    });

    osimFullFlawTest('should be true when flaw has different scores', ({ flaw }) => {
      const { shouldDisplayEmailNistForm } = useFlawCvssScores(ref(flaw));

      expect(shouldDisplayEmailNistForm.value).toBeTruthy();
    });

    osimFullFlawTest('should be false when flaw has the same scores and no comment', ({ flaw }) => {
      flaw.cvss_scores[0].comment = '';
      flaw.cvss_scores[1] = { ...flaw.cvss_scores[0], issuer: IssuerEnum.Nist };

      const { shouldDisplayEmailNistForm } = useFlawCvssScores(ref(flaw));

      expect(shouldDisplayEmailNistForm.value).toBeFalsy();
    });

    osimFullFlawTest('should be true when scores have comments', ({ flaw }) => {
      flaw.cvss_scores[1] = { ...flaw.cvss_scores[0], issuer: IssuerEnum.Nist };
      flaw.cvss_scores[0].comment = 'This is a comment';

      const { shouldDisplayEmailNistForm } = useFlawCvssScores(ref(flaw));

      expect(shouldDisplayEmailNistForm.value).toBeTruthy();
    });
  });
});
