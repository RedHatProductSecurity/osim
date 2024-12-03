import { ref } from 'vue';

import { describe, expect, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';

import { osimFullFlawTest, osimEmptyFlawTest } from '@/components/__tests__/test-suite-helpers';

import { useFlaw } from '@/composables/useFlaw';
import { useFlawAffectsModel } from '@/composables/useFlawAffectsModel';

import { router, withSetup } from '@/__tests__/helpers';
import type { ZodFlawType } from '@/types';
import { useAffectsEditingStore } from '@/stores/AffectsEditingStore';

vi.mock('@/composables/useFlaw');
vi.mock('@/composables/useFlawAffectsModel');

let pinia: ReturnType<typeof createPinia>;
type FlawWithStore = [ReturnType<typeof useFlaw>, ReturnType<typeof useAffectsEditingStore>];

function flawWithStore(testFlaw: ZodFlawType): FlawWithStore {
  const [[flaw, store]] = withSetup((): FlawWithStore => {
    const flaw = useFlaw();
    flaw.value = testFlaw;
    useFlawAffectsModel();
    return [flaw, useAffectsEditingStore()];
  },
  [pinia, router]);
  return [flaw, store];
}

describe('useAffectsEditingStore Store', () => {
  // @ts-expect-error  flaw not defined
  beforeEach(async ({ flaw }) => {
    vi.clearAllMocks();
    vi.resetModules();

    type ActualAffectsModel = typeof import('@/composables/useFlawAffectsModel');

    const { useFlawAffectsModel: _useFlawAffectsModel } =
      await vi.importActual<ActualAffectsModel>('@/composables/useFlawAffectsModel');
    pinia = createPinia();
    setActivePinia(pinia);
    vi.mocked(useFlaw).mockReturnValue(ref(flaw));
    vi.mocked(useFlawAffectsModel).mockReturnValue(_useFlawAffectsModel());
  });

  osimEmptyFlawTest('should initialize with empty arrays', async ({ flaw: testFlaw }) => {
    const [, store] = flawWithStore(testFlaw);
    expect(store.affectValuesPriorEdit).toEqual([]);
    expect(store.affectsBeingEdited).toEqual([]);
  });

  osimFullFlawTest('should add affect to editing list', ({ flaw: testFlaw }) => {
    const [flaw, store] = flawWithStore(testFlaw);
    const affect = flaw.value.affects[0];
    store.editAffect(affect);
    expect(store.affectsBeingEdited.length).toBe(1);
    expect(store.affectValuesPriorEdit).toContainEqual(affect);
  });

  osimFullFlawTest('should commit changes to affect', ({ flaw: testFlaw }) => {
    const [flaw, store] = flawWithStore(testFlaw);
    const affect = flaw.value.affects[0];
    store.editAffect(affect);
    const clonedAffect = { ...affect, ps_component: 'updated' };
    store.commitChanges(clonedAffect);
    expect(flaw.value.affects[0].ps_component).toEqual('updated');
  });

  osimFullFlawTest('should cancel changes to affect', ({ flaw: testFlaw }) => {
    const [flaw, store] = flawWithStore(testFlaw);
    const affect = flaw.value.affects[0];
    store.editAffect(affect);
    store.cancelChanges(affect);
    expect(store.affectsBeingEdited).not.toContain(affect);
  });

  osimFullFlawTest('should revert affect to last saved state', ({ flaw: testFlaw }) => {
    const [flaw, store] = flawWithStore(testFlaw);
    const affect = flaw.value.affects[0];
    store.editAffect(affect);
    affect.ps_component = 'saved';
    store.revertAffectToLastSaved(affect);
    expect(flaw.value.affects[0]).toEqual(store.affectValuesPriorEdit[0]);
  });

  osimFullFlawTest('should reset affects being edited on unmount', ({ flaw: testFlaw }) => {
    const [flaw, store] = flawWithStore(testFlaw);
    const affect = flaw.value.affects[0];
    store.editAffect(affect);
    store.$reset();
    expect(store.affectsBeingEdited).toEqual([]);
    expect(store.affectValuesPriorEdit).toEqual([]);
  });

  osimFullFlawTest('should initialize with default selection values', ({ flaw: testFlaw }) => {
    const [, store] = flawWithStore(testFlaw);
    expect(store.selectedAffects).toEqual([]);
    expect(store.areAllAffectsSelected).toBe(false);
    expect(store.isIndeterminateSelection).toBe(false);
    expect(store.areAllAffectsSelectable).toBe(true);
  });

  osimFullFlawTest('should toggle affect selection', ({ flaw: testFlaw }) => {
    const [flaw, store] = flawWithStore(testFlaw);

    const affect = flaw.value.affects[0];

    store.toggleAffectSelection(affect);
    expect(store.selectedAffects).toContain(affect);

    store.toggleAffectSelection(affect);
    expect(store.selectedAffects).not.toContain(affect);
  });

  osimFullFlawTest('should reset selections', ({ flaw: testFlaw }) => {
    const [flaw, store] = flawWithStore(testFlaw);

    const affect = flaw.value.affects[0];

    store.toggleAffectSelection(affect);
    expect(store.selectedAffects).toContain(affect);

    store.resetSelections();
    expect(store.selectedAffects).toEqual([]);
  });

  osimFullFlawTest('should determine if an affect is selectable', ({ flaw: testFlaw }) => {
    const [flaw, store] = flawWithStore(testFlaw);

    const affect = flaw.value.affects[0];

    expect(store.isSelectable(affect)).toBe(true);
  });

  osimFullFlawTest('should determine if an affect is selected', ({ flaw: testFlaw }) => {
    const [flaw, store] = flawWithStore(testFlaw);

    const affect = flaw.value.affects[0];

    store.toggleAffectSelection(affect);
    expect(store.isAffectSelected(affect)).toBe(true);
  });

  osimFullFlawTest('should toggle multiple affect selections', ({ flaw: testFlaw }) => {
    const [flaw, store] = flawWithStore(testFlaw);

    const event = { target: { checked: true } } as unknown as Event;
    store.toggleMultipleAffectSelections(event);

    for (const affect of flaw.value.affects) {
      expect(store.selectedAffects).toContain(affect);
    }
  });
});
