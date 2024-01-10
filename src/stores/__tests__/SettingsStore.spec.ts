import { describe, it, expect } from "vitest";

import { useSettingsStore } from "../SettingsStore";

import { createTestingPinia } from "@pinia/testing";

// While not used in this file, store below depends on global pinia test instance
export const mockSettingsStore = createTestingPinia({
  initialState: {
    bugzillaApiKey: "",
    jiraApiKey: "",
  }
})

const settingsStore = useSettingsStore();
describe("SettingsStore", () => {
  it("initializes", () => {
    expect(settingsStore.$state.settings).toEqual({})
  });
  it("saves values", () => {
    settingsStore.save({
      bugzillaApiKey: "beep-beep-who-got-the-keys-to-the-jeep",
      jiraApiKey: "beep-beep-who-got-the-keys-to-the-jeep",
    })
    expect(
      settingsStore.settings.bugzillaApiKey === 'beep-beep-who-got-the-keys-to-the-jeep'
    );
    expect(
      settingsStore.settings.jiraApiKey === 'beep-beep-who-got-the-keys-to-the-jeep'
    );
  });
});
