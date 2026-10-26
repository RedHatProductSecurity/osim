import { computed, readonly, ref, watch, type Ref } from 'vue';

import type { ZodFlawType } from '@/types';

/** Reads analyst notes without treating missing or legacy metadata as text. */
export function getSteeringNotes(metadata: unknown): string | undefined {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return;
  if (!('steering_notes' in metadata)) return;
  return typeof metadata.steering_notes === 'string' ? metadata.steering_notes : undefined;
}

/** Keeps the textbox draft separate from the notes applied to the local flaw. */
export function useAegisSteeringNotes(flaw: Ref<ZodFlawType>) {
  const savedNotes = computed(() => getSteeringNotes(flaw.value.aegis_meta) ?? '');
  const draft = ref(savedNotes.value);
  const hasChanges = computed(() => draft.value !== savedNotes.value);

  // A replacement also covers Reset when the saved notes themselves have not changed.
  watch([flaw, savedNotes], () => { draft.value = savedNotes.value; }, { flush: 'sync' });

  function setDraft(value: string) {
    draft.value = value;
  }

  function clear() {
    draft.value = '';
  }

  function save() {
    if (!hasChanges.value) return;
    const metadata = flaw.value.aegis_meta;
    flaw.value.aegis_meta = {
      ...(metadata && typeof metadata === 'object' && !Array.isArray(metadata) ? metadata : {}),
      steering_notes: draft.value,
    };
  }

  return { draft: readonly(draft), hasChanges, setDraft, clear, save };
}

export type AegisSteeringNotes = ReturnType<typeof useAegisSteeringNotes>;
