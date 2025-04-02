import { useFlaw } from '@/composables/useFlaw';
import { useCvss4Calculations } from '@/composables/useCvss4Calculator';
import { importActual } from '@/__tests__/helpers';

// describe('useFlawCvssScores', () => {
//   // @ts-expect-error  flaw not defined
//   beforeEach(async ({ flaw }) => {
export function useTestCvss4Calculations() {
  return async function beforeEach({ flaw }: { flaw: any }) {
    vi.resetModules();
    vi.clearAllMocks();
    const { useFlaw: _useFlaw } = await importActual('@/composables/useFlaw');
    // const { useCvssCalculator: _useCvss3Calculator } =
    // await vi.importActual<UseCvss3CalculatorDynamicImport>('@/composables/useCvssCalculator');
    const mockedUseFlaw = _useFlaw();
    mockedUseFlaw.flaw.value = flaw;
    vi.mocked(useFlaw).mockReturnValue(mockedUseFlaw);
    const { useCvss4Calculations: _useCvss4Calculations } =
      await importActual('@/composables/useCvss4Calculator');
    vi.mocked(useCvss4Calculations).mockReturnValue(_useCvss4Calculations());
  };
}
