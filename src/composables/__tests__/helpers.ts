import { useCvss4Calculator } from '@/composables/useCvss4Calculator';
import { useFlaw } from '@/composables/useFlaw';

import { importActual } from '@/__tests__/helpers';
import type { Dict, ZodFlawType } from '@/types';

// export function mockModules(modulePaths: Dict, _vi) {
//   for (const [, path] of Object.entries(modulePaths)) {
//     console.log('mocking', path);
//     _vi.doMock(path);
//   };
//   async function actualImports() {
//     const mocks: Record<string, Awaited<ReturnType<typeof importActual>>> = {};
//     for (const [moduleName, path] of Object.entries(modulePaths)) {
//       const _moduleName = `_${moduleName}`;
//       const module = await importActual(path);
//       mocks[_moduleName as string] = module[moduleName as string];
//     }
//     return mocks;
//   }
//   return { actualImports };
// }

export async function mockModules(modulePaths: Dict, _vi) {
  // for (const [, path] of Object.entries(modulePaths)) {
  //   console.log('mocking', path);
  // };
  // async function actualImports() {
  const mocks: Record<string, Awaited<ReturnType<typeof importActual>>> = {};
  for (const [moduleName, path] of Object.entries(modulePaths)) {
    const _moduleName = `_${moduleName}`;
    const module = await importActual(path);
    mocks[_moduleName as string] = module[moduleName as string];
    _vi.doMock(path, module[moduleName as string]);
  }
  // }
  return mocks;
  // return { actualImports };
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
