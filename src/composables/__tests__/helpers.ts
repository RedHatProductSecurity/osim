import type { VitestUtils } from 'vitest';

import { useCvss4Calculator } from '@/composables/useCvss4Calculator';
import { useFlaw } from '@/composables/useFlaw';

import { importActual } from '@/__tests__/helpers';
import type { Dict, ZodFlawType } from '@/types';

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
