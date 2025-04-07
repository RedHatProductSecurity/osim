import { useCvss4Calculator } from '@/composables/useCvss4Calculator';
import { useFlaw } from '@/composables/useFlaw';

import { importActual } from '@/__tests__/helpers';
import type { Dict, ZodFlawType } from '@/types';

export function useViMocks(modulePaths: [string, string][]) {
  for (const [, path] of modulePaths) {
    vi.mock(path);
  };
  return async function useActualImports() {
    const mocks: Dict = {};
    for (const [moduleName, path] of modulePaths) {
      const _moduleName = `_${moduleName}`;
      const module = await importActual(path);
      mocks[_moduleName as string] = module[moduleName as string];
    }
    return mocks;
  };
}

// export async function autoMocks(paths: string[]) {
//   for (const path of paths) {
//     const module = await import(path);


//   }
// }

export function createBeforeEach() {
  return async function beforeEach({ flaw }: { flaw: ZodFlawType }) {
    vi.resetModules();
    vi.clearAllMocks();
    const { useFlaw: _useFlaw } = await importActual('@/composables/useFlaw');
    // const { useCvss3Calculator: _useCvss3Calculator } =
    // await vi.importActual<UseCvss3CalculatorDynamicImport>('@/composables/useCvss3Calculator');
    const mockedUseFlaw = _useFlaw();
    mockedUseFlaw.flaw.value = flaw;
    vi.mocked(useFlaw).mockReturnValue(mockedUseFlaw);
    const { useCvss4Calculator: _useCvss4Calculator } =
      await importActual('@/composables/useCvss4Calculator');
    vi.mocked(useCvss4Calculator).mockReturnValue(_useCvss4Calculator());
  };
}
D;
