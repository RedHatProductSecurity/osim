<script setup lang="ts">
import { ref, watch, reactive, computed } from 'vue';

import { useSettingsStore } from '@/stores/SettingsStore';
import LoadingSpinner from '@/widgets/LoadingSpinner/LoadingSpinner.vue';

const settingsStore = useSettingsStore();

const showBugzillaKey = ref(false);
const showJiraKey = ref(false);

// Create reactive form data for API keys only
const formData = reactive({
  bugzillaApiKey: settingsStore.apiKeys.bugzillaApiKey,
  jiraApiKey: settingsStore.apiKeys.jiraApiKey,
});

// Watch for changes in API keys from store and update form
watch(() => settingsStore.apiKeys, (newApiKeys) => {
  formData.bugzillaApiKey = newApiKeys.bugzillaApiKey;
  formData.jiraApiKey = newApiKeys.jiraApiKey;
}, { immediate: true });

const apiKeysSyncing = computed(() => settingsStore.isLoadingApiKeys || settingsStore.isSavingApiKeys);

const onSubmit = async () => {
  try {
    await settingsStore.updateApiKeys({
      jiraApiKey: formData.jiraApiKey,
      bugzillaApiKey: formData.bugzillaApiKey,
    });
  } catch (error) {
    console.error('Error saving settings:', error);
  }
};

const isValid = computed(() => ({
  bugzillaApiKey: Boolean(formData.bugzillaApiKey),
  jiraApiKey: Boolean(formData.jiraApiKey),
}));
</script>

<template>
  <div class="osim-content container">
    <h1 class="mb-3">Settings</h1>

    <div class="alert alert-info" role="alert">
      API keys are saved securely on the backend and will persist across sessions.
    </div>

    <!--@submit.prevent="settingsStore.save(settings)"-->
    <form
      class="osim-settings"
      @submit.prevent="onSubmit()"
    >

      <!-- <LabelInput
        v-model="bugzillaApiKey"
        label="Bugzilla API Key"
        :error="errors.bugzillaApiKey"
      /> -->

      <div class="form-control mb-3">
        <label class="d-block">
          <span class="form-label">Bugzilla API Key</span>
          <div class="input-group">
            <input
              v-model="formData.bugzillaApiKey"
              class="form-control"
              :type="showBugzillaKey ? 'text' : 'password'"
              :class="{'is-invalid': !isValid.bugzillaApiKey,'is-valid': isValid.bugzillaApiKey}"
              :disabled="apiKeysSyncing"
              placeholder="[none saved]"
            />
            <button
              type="button"
              class="btn btn-dark eye-toggle-btn"
              :disabled="apiKeysSyncing"
              @click="showBugzillaKey = !showBugzillaKey"
            >
              <i :class="showBugzillaKey ? 'bi bi-eye-slash' : 'bi bi-eye'"></i>
            </button>
          </div>
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
          <div class="input-group">
            <input
              v-model="formData.jiraApiKey"
              class="form-control"
              :type="showJiraKey ? 'text' : 'password'"
              :class="{'is-invalid': !isValid.jiraApiKey,'is-valid': isValid.jiraApiKey}"
              :disabled="apiKeysSyncing"
              placeholder="[none saved]"
            />
            <button
              type="button"
              class="btn btn-dark eye-toggle-btn"
              :disabled="apiKeysSyncing"
              @click="showJiraKey = !showJiraKey"
            >
              <i :class="showJiraKey ? 'bi bi-eye-slash' : 'bi bi-eye'"></i>
            </button>
          </div>
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

      <div class="mt-4">
        <button
          type="submit"
          class="btn btn-primary"
          :disabled="apiKeysSyncing"
        >
          <LoadingSpinner
            v-if="settingsStore.isSavingApiKeys"
            type="border"
            class="spinner-border-sm me-2 d-inline-block"
          />
          {{ settingsStore.isSavingApiKeys ? 'Saving...' : 'Save Settings' }}
        </button>
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
