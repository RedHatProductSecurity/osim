<script setup lang="ts">
import { ref, watchEffect } from 'vue';
import {SettingsSchema, useSettingsStore} from '@/stores/SettingsStore';
import type {SettingsType} from '@/stores/SettingsStore';
import {useField, useForm} from 'vee-validate';
import {toTypedSchema} from '@vee-validate/zod';

type SensitiveFormInput = 'password' | 'text';

const settingsStore = useSettingsStore();
const revealSensitive = ref<SensitiveFormInput>('password');
const validationSchema = toTypedSchema(SettingsSchema);
const initialValues = ref(settingsStore.settings);

watchEffect(() => {
  initialValues.value = settingsStore.settings;
});

const { handleSubmit, errors, resetForm, meta } = useForm({
  validationSchema,
  initialValues,
});

const onSubmit = handleSubmit((values: SettingsType) => {
  settingsStore.save(values);
});

const onReset = (payload: MouseEvent) => {
  resetForm();
};

const { value: bugzillaApiKey } = useField('bugzillaApiKey');
const { value: jiraApiKey } = useField('jiraApiKey');

</script>

<template>
  <div class="osim-content container">
    <h1 class="mb-3">Settings</h1>

    <div class="alert alert-info" role="alert">
      These values are saved in the current session.
      The session is wiped upon closing the browser.
    </div>

    <!--@submit.prevent="settingsStore.save(settings)"-->
    <form
        @submit="onSubmit"
        class="osim-settings"
    >

      <!--<LabelInput v-model="bugzillaApiKey" label="Bugzilla API Key" :error="errors.bugzillaApiKey"/>-->
      <div class="form-control mb-3">
        <label class="form-check">
          <input class="form-check-input" type="radio" name="revealSensitive"
                 value="password"
                 v-model="revealSensitive"
          >
          <span class="form-check-label">Hide Password Values</span>
        </label>
        <label class="form-check">
          <input class="form-check-input" type="radio" name="revealSensitive"
                 value="text"
                 v-model="revealSensitive"
          >
          <span class="form-check-label">Reveal Password Values</span>
        </label>
      </div>

      <div class="form-control mb-3">
        <label class="d-block has-validation">
          <span class="form-label">Bugzilla API Key</span>
          <input 
            class="form-control"
            :type="revealSensitive"
            v-model="bugzillaApiKey"
            :class="{'is-invalid': errors.bugzillaApiKey != null}"
            placeholder="[none saved]"
          />
          <span
            v-if="errors.bugzillaApiKey"
            class="invalid-feedback d-block"
          >
            {{errors.bugzillaApiKey}}
          </span>
        </label>
        <div class="form-text">
          <p>Required for actions which interface with Bugzilla.</p>
          <p>Steps to create an API key:</p>
          <ul>
            <li>Visit your Bugzilla user preferences page</li>
            <li>Click the API Keys tab</li>
            <li>Check the "Generate a new API key" box</li>
            <li>Click the "Submit Changes" button</li>
            <li>Copy the API key from the banner at the top of the page. Optionally, save it to your password manager.
              The API key will not be shown again after you navigate away from the page.
            </li>
          </ul>
        </div>
      </div>
      <div class="form-control mb-3">
        <label class="d-block has-validation">
          <span class="form-label">JIRA API Key</span>
          <input 
            class="form-control"
            :type="revealSensitive"
            v-model="jiraApiKey"
            :class="{'is-invalid': errors.jiraApiKey != null}"
            placeholder="[none saved]"
          />
          <span
            v-if="errors.jiraApiKey"
            class="invalid-feedback d-block"
          >
            {{errors.jiraApiKey}}
          </span>
        </label>
        <div class="form-text">
          <p>Required for actions which interface with JIRA.</p>
          <p>Steps to create an API key:</p>
          <ul>
            <li>Log into your JIRA account.</li>
            <li>Go to 'Your Profile' page under your user icon menu in the upper right corner. </li>
            <li>Select Personal Access Tokens from the left hand sidebar menu.</li>
            <li>Click Create token button.</li>
            <li>Name the token meaningfully (eg. 'OSIM token') and click create.</li>
            <li>Copy token value and close.</li>
          </ul>
        </div>
      </div>
      <div
          v-if="meta.dirty"
          class="alert alert-warning"
          role="alert"
      >Remember to save your changes</div>
      <div class="osim-save-buttons text-end">
        <button type="button" class="btn btn-primary me-3" @click="onReset">Reset</button>
        <button type="submit" class="btn btn-primary">Save</button>
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
