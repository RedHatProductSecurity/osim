import { ref, type DeepReadonly } from 'vue';

import type { ZodFlawType } from '@/types';
import {
  isFlawConflict,
  rebaseDisjointFlaw,
  type FlawRebaseField,
} from '@/utils/flawRebase';

/**
 * Shared check for a flaw save that the server rejected as stale.
 * Section screens and the conflict dialog use the tracked field lists.
 */
export function useCollisionConflict() {
  const conflicts = ref<FlawRebaseField[]>([]);
  const adopted = ref<FlawRebaseField[]>([]);

  async function resolveFlawSave(
    base: DeepReadonly<ZodFlawType>,
    mine: ZodFlawType,
    save: (body: ZodFlawType, suppressConflictToast: boolean) => Promise<ZodFlawType>,
    reload: () => Promise<ZodFlawType>,
    onUnresolved: (error: unknown) => void,
  ): Promise<ZodFlawType> {
    conflicts.value = [];
    adopted.value = [];

    try {
      return await save(mine, true);
    } catch (error) {
      if (!isFlawConflict(error)) throw error;

      let serverFlaw: ZodFlawType;
      try {
        serverFlaw = await reload();
      } catch (reloadError) {
        console.error('useCollisionConflict::resolveFlawSave() failed to reload flaw', reloadError);
        onUnresolved(error);
        throw error;
      }

      const result = rebaseDisjointFlaw(base, mine, serverFlaw);
      conflicts.value = result.conflicts;
      adopted.value = result.adopted;
      if (result.conflicts.length > 0 || result.merged === null) {
        onUnresolved(error);
        throw error;
      }

      return save(result.merged, false);
    }
  }

  return {
    adopted,
    conflicts,
    resolveFlawSave,
  };
}
