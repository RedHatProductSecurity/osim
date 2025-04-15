import type { VitestUtils } from 'vitest';

import { importActual } from '@/__tests__/helpers';
import type { Dict, ZodFlawType } from '@/types';

type Imported = Awaited<ReturnType<typeof importActual>>;

export async function mockModules(namedModulePaths: Dict, _vi: VitestUtils) {
  const modules: Record<string, Imported> = {};
  for (const [name, path] of Object.entries(namedModulePaths)) {
    // const importedModule = await importActual(path);
    // const module = importedModule[moduleName as string] ?? importedModule;
    const { module, moduleName } = await mockModule(name, path, _vi);
    modules[moduleName as string] = module;
    // _vi.doMock(path, module);
  }

  return modules;
}

async function mockModule(moduleName: string, importPath: string, _vi: VitestUtils) {
  const importedModule = await importActual(importPath);
  const module = importedModule[moduleName as string] ?? importedModule;
  if (moduleName === 'useFlaw') {
    _vi.mock(importPath, module);
  } else {
    _vi.doMock(importPath, module);
  }
  return { moduleName, module };
}

export function useMockFlawWithModules(flaw: ZodFlawType, _vi: VitestUtils) {
  return async (modules: Dict) => {
    // const { module: useFlaw } = await mockModule('useFlaw', '@/composables/useFlaw', _vi);

    // console.log(flaw);
    // useFlaw().flaw.value = flaw;
    // console.log(useFlaw().flaw.value);
    // modules['useFlaw'] = undefined;
    // delete modules['useFlaw'];
    const mockedModules = await mockModules(modules, _vi);
    // mockedModules['useFlaw'] = useFlaw;
    mockedModules.useFlaw().flaw.value = flaw;
    return mockedModules;
  };
}
