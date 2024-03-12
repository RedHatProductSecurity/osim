<script setup lang="ts">
import {reactive, ref} from 'vue';
import {useSettingsStore} from '@/stores/SettingsStore';
import type {SettingsType} from '@/stores/SettingsStore';

const settingsStore = useSettingsStore();

const inputLabels = ref<{ [name: string]: string }>({});

let revealSensitive = ref('hide');

let settings = reactive<SettingsType>(settingsStore.settings);

</script>

<template>
  <div class="osim-content container">
    <h1 class="mb-3">Settings</h1>

    <form @submit.prevent="settingsStore.save(settings)">


      <div class="form-check">
        <input
          v-model="revealSensitive"
          v-input-label:reveal="inputLabels"
          class="form-check-input"
          type="radio"
          name="revealSensitive"
          value="true"
        >
        <label :for="inputLabels.reveal">Reveal Sensitive Values</label>
      </div>
      <div class="form-check">
        <input
          v-model="revealSensitive"
          v-input-label:hide="inputLabels"
          class="form-check-input"
          type="radio"
          name="revealSensitive"
          value="false"
        >
        <label :for="inputLabels.hide">Hide Sensitive Values</label>
      </div>

      <label class="form-check">
        <input
          v-model="revealSensitive"
          class="form-check-input"
          type="radio"
          name="revealSensitive2"
          value="reveal"
        >
        <span class="form-check-label">Reveal Sensitive Values</span>
      </label>
      <label class="form-check">
        <input
          v-model="revealSensitive"
          class="form-check-input"
          type="radio"
          name="revealSensitive2"
          value="hide"
        >
        <span class="form-check-label">Hide Sensitive Values</span>
      </label>

      <div class="mb-3">
        <label class="d-block">
          <span class="form-label">Bugzilla-Api-Key</span>
          <input
            v-model="settings.bugzillaApiKey"
            :type="{reveal: 'text', hide: 'password'}[revealSensitive]"
            class="form-control"
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
            <li>Copy the API key from the banner at the top of the page.
              Optionally, save it to your password manager.
              The API key will not be shown again after you navigate away from the page.
            </li>
          </ul>
        </div>
      </div>

      <button type="submit" class="btn btn-primary">Save</button>

    </form>

  </div>
</template>

<style scoped>


</style>
