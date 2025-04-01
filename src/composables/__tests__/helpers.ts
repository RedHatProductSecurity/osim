import type { VitestUtils } from 'vitest';

import { importActual } from '@/__tests__/helpers';
import type { Dict, ZodFlawType } from '@/types';

type Imported = Awaited<ReturnType<typeof importActual>>;

export async function mockModules(modulePaths: Dict, _vi: VitestUtils) {
  const modules: Record<string, Imported> = {};
  for (const [moduleName, path] of Object.entries(modulePaths)) {
    const module = await importActual(path);
    modules[moduleName as string] = module[moduleName as string] ?? module;
    _vi.doMock(path, module[moduleName as string]);
  }

  return modules;
}

export function useMockFlawWithModules(flaw: ZodFlawType, _vi: VitestUtils) {
  return async (modules: Dict) => {
    const mockedModules = await mockModules(modules, _vi);
    mockedModules.useFlaw().flaw.value = flaw;
    return mockedModules;
  };
}
