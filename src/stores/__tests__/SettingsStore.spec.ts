import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { createPinia, setActivePinia } from 'pinia';

import { useSettingsStore, type PersistentSettingsType } from '@/stores/SettingsStore';
import { useToastStore } from '@/stores/ToastStore';

const initialState: PersistentSettingsType = {
  showNotifications: false,
  affectsPerPage: 10,
  trackersPerPage: 10,
  isHidingLabels: false,
  privacyNoticeShown: true,
  aiUsageNoticeShown: true,
  unifiedCommentsView: false,
  affectsColumnWidths: [],
  trackersColumnWidths: [],
};

// While not used in this file, store below depends on global pinia test instance
export const mockSettingsStore = createTestingPinia({
  initialState,
});

describe('settingsStore', () => {
  let settingsStore: ReturnType<typeof useSettingsStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    settingsStore = useSettingsStore();
  });

  it('initializes', () => {
    expect(settingsStore.$state.settings).toEqual(initialState);
  });

  it('saves values', () => {
    const settings = {
      showNotifications: !initialState.showNotifications,
      affectsPerPage: 1337,
      trackersPerPage: 1337,
      isHidingLabels: !initialState.isHidingLabels,
      privacyNoticeShown: false,
      aiUsageNoticeShown: false,
      unifiedCommentsView: false,
      affectsColumnWidths: [],
      trackersColumnWidths: [],
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
        showNotifications: false,
        affectsPerPage: 10,
        trackersPerPage: 10,
        isHidingLabels: false,
        privacyNoticeShown: true,
        aiUsageNoticeShown: false,
        unifiedCommentsView: false,
        affectsColumnWidths: [],
        trackersColumnWidths: [],
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
    const pinia = createTestingPinia({
      createSpy: vi.fn,
      stubActions: false,
    });

    const toastStore = useToastStore(pinia);
    const addToastSpy = vi.spyOn(toastStore, 'addToast');

    const mockLocalStorage = {
      getItem: vi.fn().mockReturnValue(JSON.stringify({
        showNotifications: false,
        affectsPerPage: 10,
        trackersPerPage: 10,
        isHidingLabels: false,
        privacyNoticeShown: true,
        aiUsageNoticeShown: true,
        unifiedCommentsView: false,
        affectsColumnWidths: [],
        trackersColumnWidths: [],
      })),
      setItem: vi.fn(),
    };
    Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

    useSettingsStore(pinia);

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
      getItem: vi.fn().mockReturnValue(JSON.stringify({
        showNotifications: false,
        affectsPerPage: 10,
        trackersPerPage: 10,
        isHidingLabels: false,
        privacyNoticeShown: true,
        aiUsageNoticeShown: false,
        unifiedCommentsView: false,
        affectsColumnWidths: [],
        trackersColumnWidths: [],
      })),
      setItem: vi.fn(),
    };
    Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

    const settingsStore = useSettingsStore(pinia);

    expect(settingsStore.settings.aiUsageNoticeShown).toBe(true);
  });
});
