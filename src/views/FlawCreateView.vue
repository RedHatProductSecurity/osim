<script setup lang="ts">
import {onMounted, ref} from 'vue';
import {createFlaw} from '@/services/FlawService';
import FlawCreateForm from '@/components/FlawCreateForm.vue';
import router from '@/router';
import {useSettingsStore} from '@/stores/SettingsStore';

const flaw = ref({});
// const props = defineProps<{
//   id: string
// }>();

const error = ref('');

// onMounted(() => {
//   getFlaw(props.id)
//       .then(theFlaw => flaw.value = theFlaw)
//       .catch(err => console.error(err))
// });

const settingsStore = useSettingsStore();

function onSubmit() {
  error.value = '';
  console.log('Submitting the flaw', flaw.value);
  createFlaw(flaw.value)
      .then(response => {
        console.log('submit response', response);
        router.push({name: 'flaw-detail', params: {id: response.uuid}});
      })
      .catch(e => {
        console.log('submit error', e);
        let errorText = JSON.stringify((e.response?.data ?? e), null, 2);
        error.value = errorText;
      })
}

</script>

<template>
  <main>

    <div class="alert alert-danger"
         role="alert"
        v-if="!/.+/.test(settingsStore.settings.bugzillaApiKey ?? '')">
      You have not set your Bugzilla API key!<br/>
      Flaw creation requires your Bugzilla API key to be set.<br/>
      Visit <RouterLink :to="{name: 'settings'}">Settings</RouterLink>.
    </div>

    <div v-if="error !== ''" class="alert alert-danger">{{error}}</div>
    <!--<textarea v-bind:value="JSON.stringify(flaw)"/>-->
    <form @submit.prevent="onSubmit">

    <FlawCreateForm v-model="flaw"/>

    <div class="container">

      <hr class="mt-5">
      <div class="row row-cols-5 action-buttons g-3">
        <button class="btn btn-primary col">Create New Flaw</button>
      </div>
    </div>

    </form>
    <textarea>{{JSON.stringify(flaw, null, 2)}}</textarea>

  </main>
</template>

<style scoped>
textarea {
  margin-top: 1em;
  white-space: pre-wrap;
  width: 100%;
  height: 20em;
}
</style>
