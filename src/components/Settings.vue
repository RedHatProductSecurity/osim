<script setup lang="ts">
import {reactive, ref, unref} from 'vue';
import {useSettingsStore} from '@/stores/SettingsStore';
import type {SettingsType} from '@/stores/SettingsStore';
import EditableText from '@/components/widgets/EditableText.vue';
import EditableDate from '@/components/widgets/EditableDate.vue';

const settingsStore = useSettingsStore();
type SensitiveFormInput = 'password' | 'text';
let revealSensitive = ref<SensitiveFormInput>('password');

let settings = reactive<SettingsType>({...settingsStore.settings});

let editableText1 = ref<string>('foobar');
let editableDate1 = ref<Date>(new Date());
</script>

<template>
  <div class="osim-content container">
    <h1 class="mb-3">Settings</h1>
    <div class="alert alert-info" role="alert">These values are saved in the current session. The session is wiped upon closing the browser.</div>

    <form
        @submit.prevent="settingsStore.save(settings)"
        class="osim-settings"
    >

      <div class="form-control mb-3">
        <label class="form-check">
          <input class="form-check-input" type="radio" name="revealSensitive2"
                 value="password"
                 v-model="revealSensitive"
          >
          <span class="form-check-label">Hide Password Values</span>
        </label>
        <label class="form-check">
          <input class="form-check-input" type="radio" name="revealSensitive2"
                 value="text"
                 v-model="revealSensitive"
          >
          <span class="form-check-label">Reveal Password Values</span>
        </label>
      </div>

      <div class="form-control mb-3">
        <label class="d-block">
          <span class="form-label">Bugzilla API Key</span>
          <input :type="revealSensitive" class="form-control"
                 v-model="settings.bugzillaApiKey"
                 placeholder="[none saved]"
          />
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


      <EditableText :editable="true" :editing="false" v-model="editableText1"/>
      <EditableDate :editable="true" :editing="false" v-model="editableDate1"/>
      <button type="submit" class="btn btn-primary float-end">Save</button>

    </form>

  </div>
</template>

<style scoped>

.osim-settings {
  max-width: 45rem;
  margin: auto;
}

</style>
