<script setup lang="ts">
import { ref, watch } from 'vue';

import { useSettingsStore } from '@/stores/SettingsStore';
import type { SettingsType } from '@/stores/SettingsStore';

type SensitiveFormInput = 'password' | 'text';

const settingsStore = useSettingsStore();
const revealSensitive = ref<SensitiveFormInput>('password');

const settings = ref(settingsStore.settings);

const onSubmit = (values: SettingsType) => {
  settingsStore.settings = values;
};

const isValid = ref({
  bugzillaApiKey: Boolean(settings.value.bugzillaApiKey),
  jiraApiKey: Boolean(settings.value.jiraApiKey),
});

watch(settings, () => {
  isValid.value = {
    bugzillaApiKey: Boolean(settings.value.bugzillaApiKey),
    jiraApiKey: Boolean(settings.value.jiraApiKey),
  };
}, { deep: true });
</script>

<template>
  <div class="osim-content container">
    <h1 class="mb-3">Settings</h1>

    <div class="alert alert-info" role="alert">
      These values are saved in browser local storage, and should persist across tabs
      and browser sessions. Ensure that security best practices are followed.
    </div>

    <!--@submit.prevent="settingsStore.save(settings)"-->
    <form
      class="osim-settings"
      @submit="onSubmit(settings)"
    >

      <!-- <LabelInput
        v-model="bugzillaApiKey"
        label="Bugzilla API Key"
        :error="errors.bugzillaApiKey"
      /> -->
      <div class="form-control mb-3">
        <label class="form-check">
          <input
            v-model="revealSensitive"
            class="form-check-input"
            type="radio"
            name="revealSensitive"
            value="password"
          >
          <span class="form-check-label">Hide Password Values</span>
        </label>
        <label class="form-check">
          <input
            v-model="revealSensitive"
            class="form-check-input"
            type="radio"
            name="revealSensitive"
            value="text"
          >
          <span class="form-check-label">Reveal Password Values</span>
        </label>
      </div>

      <div class="form-control mb-3">
        <label class="d-block">
          <span class="form-label">Bugzilla API Key</span>
          <input
            v-model="settings.bugzillaApiKey"
            class="form-control"
            :type="revealSensitive"
            :class="{'is-invalid': !isValid.bugzillaApiKey,'is-valid': isValid.bugzillaApiKey}"
            placeholder="[none saved]"
          />
          <span
            v-if="!isValid.bugzillaApiKey"
            class="invalid-feedback d-block"
          >
            Please provide a Bugzilla key.
          </span>
        </label>
        <div class="form-text">
          <p>Required for actions which interface with Bugzilla.</p>
          <details>
            <summary>Steps to create an API key:</summary>
            <ul>
              <li>Visit your Bugzilla user preferences page</li>
              <li>Click the API Keys tab</li>
              <li>Check the "Generate a new API key" box</li>
              <li>Click the "Submit Changes" button</li>
              <li>
                Copy the API key from the banner at the top of the page.
                Optionally, save it to your password manager.
                The API key will not be shown again after you navigate away from the page.
              </li>
            </ul>
          </details>
        </div>
      </div>
      <div class="form-control mb-3">
        <label class="d-block">
          <span class="form-label">JIRA API Key</span>
          <input
            v-model="settings.jiraApiKey"
            class="form-control"
            :type="revealSensitive"
            :class="{'is-invalid': !isValid.jiraApiKey,'is-valid': isValid.jiraApiKey}"
            placeholder="[none saved]"
          />
          <span
            v-if="!isValid.jiraApiKey"
            class="invalid-feedback d-block"
          >
            Please provide a Jira key.
          </span>
        </label>
        <div class="form-text">
          <p>Required for actions which interface with JIRA.</p>
          <details>
            <summary>Steps to create an API key:</summary>
            <ul>
              <li>Log into your JIRA account.</li>
              <li>
                Go to 'Your Profile' page under your user icon menu in the upper right corner.
              </li>
              <li>Select Personal Access Tokens from the left hand sidebar menu.</li>
              <li>Click Create token button.</li>
              <li>Name the token meaningfully (eg. 'OSIM token') and click create.</li>
              <li>Copy token value and close.</li>
            </ul>
          </details>
        </div>
      </div>
    </form>
  </div>
</template>

<style scoped>
.osim-settings {
  max-width: 45rem;
  margin: auto;
}
</style>
