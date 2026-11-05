import { defineComponent, h, nextTick, type Ref } from 'vue';

import { flushPromises, mount } from '@vue/test-utils';
import { createPinia } from 'pinia';

import App from '@/App.vue';
import SettingsView from '@/views/SettingsView.vue';
import { defaultPersistentSettings, useSettingsStore } from '@/stores/SettingsStore';
import { osimRuntimeStatus } from '@/stores/osimRuntime';
import { OsimRuntimeStatus } from '@/types/zodOsim';
import { getApiKeysFromBackend, saveApiKeysToBackend } from '@/services/ApiKeyService';

vi.mock('@/services/ApiKeyService', () => ({
  getApiKeysFromBackend: vi.fn(),
  saveApiKeysToBackend: vi.fn(),
  notifyApiKeyUnset: vi.fn(),
}));
vi.mock('@/services/CweService', () => ({ updateCWEData: vi.fn() }));
vi.mock('@/stores/AuthStore', () => ({
  useAuthStore: () => ({ isAuthenticated: true, isLoggedIn: true }),
}));
vi.mock('@/stores/UserStore', () => ({
  useUserStore: () => ({ userEmail: '' }),
}));

const settingsKey = 'OSIM::USER-SETTINGS';
const runtimeStatus = osimRuntimeStatus as Ref<OsimRuntimeStatus>;
const savedPreferences = {
  ...defaultPersistentSettings,
  privacyNoticeShown: true,
  aiUsageNoticeShown: true,
};

// Render the actual Settings view in the app shell without unrelated navigation services.
const SettingsRouterView = defineComponent({
  setup(_, { slots }) {
    return () => h('div', slots.default?.({ Component: SettingsView }));
  },
});

function readPreferences() {
  return JSON.parse(localStorage.getItem(settingsKey)!);
}

describe('dark mode preferences', () => {
  const stores: ReturnType<typeof useSettingsStore>[] = [];

  function mountApp() {
    const pinia = createPinia();
    const store = useSettingsStore(pinia);
    stores.push(store);
    const wrapper = mount(App, {
      global: {
        plugins: [pinia],
        mocks: { $route: { meta: {} } },
        stubs: {
          RouterView: SettingsRouterView,
          Navbar: true,
          SessionWarningBanner: true,
          ToastContainer: true,
          ChangeLog: true,
        },
      },
    });
    return { wrapper, store };
  }

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-bs-theme');
    runtimeStatus.value = OsimRuntimeStatus.READY;
    vi.mocked(getApiKeysFromBackend).mockResolvedValue({ bugzilla: null, jira: null });
    vi.mocked(saveApiKeysToBackend).mockResolvedValue(undefined);
  });

  afterEach(() => {
    for (const store of stores.splice(0)) store.$dispose();
    localStorage.clear();
    document.documentElement.removeAttribute('data-bs-theme');
  });

  it('defaults to light and exposes a labeled, described checkbox switch in Settings', () => {
    const { wrapper } = mountApp();
    const control = wrapper.get<HTMLInputElement>('input[role="switch"]');
    const label = wrapper.get(`label[for="${control.attributes('id')}"]`);

    expect(label.text()).toBe('Dark mode');
    expect(control.attributes('type')).toBe('checkbox');
    expect(control.element.labels).toContain(label.element);
    expect(wrapper.get(`#${control.attributes('aria-describedby')}`).text()).not.toBe('');
    expect(control.element.checked).toBe(false);
    expect(control.element.disabled).toBe(false);
    expect(document.documentElement.getAttribute('data-bs-theme')).toBe('light');
  });

  it.each([
    ['initializing', OsimRuntimeStatus.INIT],
    ['unavailable', OsimRuntimeStatus.ERROR],
  ])('applies a saved dark preference while the runtime is %s', (_, status) => {
    localStorage.setItem(settingsKey, JSON.stringify({ ...savedPreferences, darkMode: true }));
    runtimeStatus.value = status;

    const { wrapper } = mountApp();

    expect(document.documentElement.getAttribute('data-bs-theme')).toBe('dark');
    expect(wrapper.find('input[role="switch"]').exists()).toBe(false);
    expect(getApiKeysFromBackend).not.toHaveBeenCalled();
    expect(saveApiKeysToBackend).not.toHaveBeenCalled();
  });

  it('retains the saved appearance when startup reaches READY and loads API keys', async () => {
    localStorage.setItem(settingsKey, JSON.stringify({ ...savedPreferences, darkMode: true }));
    runtimeStatus.value = OsimRuntimeStatus.INIT;
    const { wrapper } = mountApp();

    runtimeStatus.value = OsimRuntimeStatus.READY;
    await nextTick();
    await vi.dynamicImportSettled();
    await flushPromises();

    expect(getApiKeysFromBackend).toHaveBeenCalledOnce();
    expect(wrapper.get<HTMLInputElement>('input[role="switch"]').element.checked).toBe(true);
    expect(document.documentElement.getAttribute('data-bs-theme')).toBe('dark');
  });

  it('migrates pre-theme settings to light without losing existing preferences', async () => {
    const legacyPreferences = {
      ...savedPreferences,
      showNotifications: true,
      affectsPerPage: 25,
      trackersPerPage: 50,
      affectsColumnOrder: ['impact', 'component'],
      affectsVisibility: { impact: false },
      unifiedCommentsView: true,
    };
    Reflect.deleteProperty(legacyPreferences, 'darkMode');
    localStorage.setItem(settingsKey, JSON.stringify(legacyPreferences));

    const { store, wrapper } = mountApp();
    await nextTick();

    expect(store.settings).toEqual({ ...legacyPreferences, darkMode: false });
    expect(readPreferences()).toEqual({ ...legacyPreferences, darkMode: false });
    expect(wrapper.get<HTMLInputElement>('input[role="switch"]').element.checked).toBe(false);
    expect(document.documentElement.getAttribute('data-bs-theme')).toBe('light');
  });

  it('applies both switch positions immediately and restores each preference on a fresh startup', async () => {
    let app = mountApp();
    await flushPromises();

    for (const darkMode of [true, false]) {
      await app.wrapper.get('input[role="switch"]').setValue(darkMode);

      expect(document.documentElement.getAttribute('data-bs-theme')).toBe(darkMode ? 'dark' : 'light');
      expect(readPreferences().darkMode).toBe(darkMode);
      expect(saveApiKeysToBackend).not.toHaveBeenCalled();
      expect(getApiKeysFromBackend).not.toHaveBeenCalled();

      app.wrapper.unmount();
      app.store.$dispose();
      app = mountApp();
      await flushPromises();

      expect(app.wrapper.get<HTMLInputElement>('input[role="switch"]').element.checked).toBe(darkMode);
      expect(document.documentElement.getAttribute('data-bs-theme')).toBe(darkMode ? 'dark' : 'light');
    }
  });

  it.each(['loading', 'saving'] as const)('allows appearance changes while API keys are %s', async (operation) => {
    const { store, wrapper } = mountApp();
    let finishRequest!: () => void;
    const pending = new Promise<void>((resolve) => { finishRequest = resolve; });
    let request: Promise<void>;
    if (operation === 'loading') {
      vi.mocked(getApiKeysFromBackend).mockImplementationOnce(async () => {
        await pending;
        return { bugzilla: 'retrieved-key', jira: null };
      });
      request = store.initializeApiKeys();
      await request;
    } else {
      vi.mocked(saveApiKeysToBackend).mockReturnValueOnce(pending);
      request = store.updateApiKeys({ bugzillaApiKey: 'new-key' });
    }
    await nextTick();

    try {
      expect(wrapper.get<HTMLButtonElement>('button[type="submit"]').element.disabled).toBe(true);
      const control = wrapper.get<HTMLInputElement>('input[role="switch"]');
      expect(control.element.disabled).toBe(false);
      await control.setValue(true);

      expect(document.documentElement.getAttribute('data-bs-theme')).toBe('dark');
      expect(readPreferences().darkMode).toBe(true);
      expect(saveApiKeysToBackend).toHaveBeenCalledTimes(operation === 'saving' ? 1 : 0);
    } finally {
      finishRequest();
      await request;
      await flushPromises();
    }

    expect(wrapper.get<HTMLButtonElement>('button[type="submit"]').element.disabled).toBe(false);
    expect(wrapper.get<HTMLInputElement>('input[role="switch"]').element.checked).toBe(true);
    expect(document.documentElement.getAttribute('data-bs-theme')).toBe('dark');
    expect(readPreferences().darkMode).toBe(true);
  });

  it('resets a saved dark preference to light in the app and on subsequent startup', async () => {
    localStorage.setItem(settingsKey, JSON.stringify({ ...savedPreferences, darkMode: true }));
    const { store, wrapper } = mountApp();
    await flushPromises();

    store.$reset();
    await nextTick();

    expect(wrapper.get<HTMLInputElement>('input[role="switch"]').element.checked).toBe(false);
    expect(document.documentElement.getAttribute('data-bs-theme')).toBe('light');
    expect(readPreferences().darkMode).toBe(false);

    wrapper.unmount();
    store.$dispose();
    mountApp();
    expect(document.documentElement.getAttribute('data-bs-theme')).toBe('light');
  });
});
