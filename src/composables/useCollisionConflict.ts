import { ref, type DeepReadonly } from 'vue';

import type { ZodFlawType } from '@/types';
import {
  isFlawConflict,
  rebaseDisjointFlaw,
  type FlawFieldConflict,
  type FlawRebaseField,
} from '@/utils/flawRebase';

export type PendingFlawConflict = {
  adopted: FlawRebaseField[];
  conflicts: FlawFieldConflict[];
  formEdits: FlawRebaseField[];
  mine: ZodFlawType;
  server: ZodFlawType;
};

/**
 * Shared check for a flaw save that the server rejected as stale.
 * Section screens and the conflict dialog use the tracked field lists.
 */
export function useCollisionConflict() {
  const conflicts = ref<FlawFieldConflict[]>([]);
  const adopted = ref<FlawRebaseField[]>([]);
  const pendingFlawConflict = ref<null | PendingFlawConflict>(null);

  async function resolveFlawSave(
    base: DeepReadonly<ZodFlawType>,
    mine: ZodFlawType,
    save: (body: ZodFlawType, suppressConflictToast: boolean) => Promise<ZodFlawType>,
    reload: () => Promise<ZodFlawType>,
    onUnresolved: (error: unknown) => void,
  ): Promise<ZodFlawType> {
    conflicts.value = [];
    adopted.value = [];
    pendingFlawConflict.value = null;

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
      if (result.conflicts.length > 0) {
        pendingFlawConflict.value = {
          adopted: result.adopted,
          conflicts: result.conflicts,
          formEdits: result.formEdits,
          mine,
          server: serverFlaw,
        };
        throw error;
      }
      if (result.merged === null) {
        onUnresolved(error);
        throw error;
      }

      return save(result.merged, false);
    }
  }

  return {
    adopted,
    conflicts,
    pendingFlawConflict,
    resolveFlawSave,
  };
}
