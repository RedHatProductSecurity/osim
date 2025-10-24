import { ref } from 'vue';

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { createPinia, setActivePinia } from 'pinia';
import { useLocalStorage } from '@vueuse/core';

import { defaultPersistentSettings, useSettingsStore, type PersistentSettingsType } from '@/stores/SettingsStore';
import { useToastStore } from '@/stores/ToastStore';

vi.mock('@vueuse/core', async (importOriginal) => {
  const { ref } = await import('vue');
  const vueUse = await importOriginal<typeof import('@vueuse/core')>();

  return ({
    ...vueUse,
    useLocalStorage: vi.fn().mockImplementation((key, initialValue) => ref(initialValue)),
  });
});

const initialState: PersistentSettingsType = {
  ...defaultPersistentSettings,
  privacyNoticeShown: true,
  aiUsageNoticeShown: true,
};

describe('settingsStore', () => {
  let settingsStore: ReturnType<typeof useSettingsStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    settingsStore = useSettingsStore();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it('initializes', () => {
    expect(settingsStore.$state.settings).toEqual(initialState);
  });

  it('saves values', () => {
    const settings = {
      ...initialState,
      showNotifications: !initialState.showNotifications,
      affectsPerPage: 1337,
      trackersPerPage: 1337,
      isHidingLabels: !initialState.isHidingLabels,
    };

    settingsStore.settings = settings;

    expect(settingsStore.settings).toEqual(settings);
  });

  it('reset', () => {
    settingsStore.settings.showNotifications = true;
    settingsStore.$reset();

    expect(settingsStore.settings.showNotifications).toBe(false);
  });

  it('shows AI usage toast when aiUsageNoticeShown is false', () => {
    const pinia = createTestingPinia({
      createSpy: vi.fn,
      stubActions: false,
    });

    const toastStore = useToastStore(pinia);
    const addToastSpy = vi.spyOn(toastStore, 'addToast');

    const mockLocalStorage = {
      getItem: vi.fn().mockReturnValue(JSON.stringify({
        ...initialState,
        aiUsageNoticeShown: false,
      })),
      setItem: vi.fn(),
    };
    Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

    useSettingsStore(pinia);

    expect(addToastSpy).toHaveBeenCalledWith({
      title: 'AI Usage Notice',
      body: expect.stringContaining('You are about to use a Red Hat AI-powered system'),
      css: 'info',
      timeoutMs: 0,
    });
  });

  it('does not show AI usage toast when aiUsageNoticeShown is true', () => {
    const toastStore = useToastStore();
    const addToastSpy = vi.spyOn(toastStore, 'addToast');
    vi.mocked(useLocalStorage).mockReturnValueOnce(ref(initialState));

    useSettingsStore();

    expect(addToastSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'AI Usage Notice',
      }),
    );
  });

  it('sets aiUsageNoticeShown to true after showing the notice', () => {
    const pinia = createTestingPinia({
      createSpy: vi.fn,
      stubActions: false,
    });

    const mockLocalStorage = {
      getItem: vi.fn().mockReturnValue(JSON.stringify(initialState)),
      setItem: vi.fn(),
    };
    Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

    const settingsStore = useSettingsStore(pinia);

    expect(settingsStore.settings.aiUsageNoticeShown).toBe(true);
  });
});
