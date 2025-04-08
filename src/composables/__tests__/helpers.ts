import type { VitestUtils } from 'vitest';

import { importActual } from '@/__tests__/helpers';
import type { Dict } from '@/types';

export async function mockModules(modulePaths: Dict, _vi: VitestUtils) {
  const mocks: Record<string, Awaited<ReturnType<typeof importActual>>> = {};
  for (const [moduleName, path] of Object.entries(modulePaths)) {
    const _moduleName = `_${moduleName}`;
    const module = await importActual(path);
    mocks[_moduleName as string] = module[moduleName as string];
    _vi.doMock(path, module[moduleName as string]);
  }

  return mocks;
}
