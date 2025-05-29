import { createPinia, setActivePinia } from 'pinia';

import { useToastStore, type ToastNew } from '@/stores/ToastStore';

describe('toastStore', () => {
  let toastStore: ReturnType<typeof useToastStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    toastStore = useToastStore();
  });

  it('addToast', () => {
    const toast: ToastNew = { body: 'Test Toast' };

    toastStore.addToast(toast);

    expect(toastStore.toasts).toHaveLength(1);
    expect(toastStore.toasts[0].isFresh).toBe(true);
  });

  it('reset', () => {
    const toast: ToastNew = { body: 'Test Toast' };
    toastStore.addToast(toast);
    expect(toastStore.toasts).toHaveLength(1);
    toastStore.$reset();
    expect(toastStore.toasts).toHaveLength(0);
  });
});
