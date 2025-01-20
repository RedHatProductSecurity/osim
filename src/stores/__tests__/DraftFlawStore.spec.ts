import { createPinia, setActivePinia } from 'pinia';

import { useFlaw } from '@/composables/useFlaw';

import type { ZodFlawType } from '@/types/zodFlaw';
import { useDraftFlawStore } from '@/stores/DraftFlawStore';

const { blankFlaw } = useFlaw();

describe('draftFlawStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('should save flaw', () => {
    const draftFlawStore = useDraftFlawStore();
    const flaw = blankFlaw();

    draftFlawStore.saveDraftFlaw(flaw);

    expect(draftFlawStore.draftFlaw).toEqual(flaw);
  });

  it('should add draft fields', () => {
    const draftFlawStore = useDraftFlawStore();
    const flaw = {
      ...blankFlaw(),
      acknowledgements: [{ name: 'test', uuid: 'uuid' }],
    } as ZodFlawType;
    const flawFields = { ...blankFlaw(), acknowledgments: [{ name: 'test', uuid: 'uuid2' }] } as ZodFlawType;

    draftFlawStore.saveDraftFlaw(flaw);
    const mergedFlaw = draftFlawStore.addDraftFields(flawFields);

    expect(mergedFlaw).toEqual(flawFields);
  });
});
