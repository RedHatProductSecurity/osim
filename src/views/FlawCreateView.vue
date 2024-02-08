<script setup lang="ts">
import {onMounted, ref} from 'vue';
import {createFlaw} from '@/services/FlawService';
import FlawCreateForm from '@/components/FlawCreateForm.vue';
import router from '@/router';
import {useSettingsStore} from '@/stores/SettingsStore';
import {notifyApiKeyUnset} from '@/services/ApiKeyService';
import IssueEdit from '@/components/IssueEdit.vue';
import type {ZodFlawType} from '@/types/zodFlaw';

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

notifyApiKeyUnset();


const blankFlaw: ZodFlawType = {
  affects: [],
  classification: {
    state: 'NEW',
    workflow: '',
  },
  component: '',
  cve_id: '',
  cvss3: '',
  cvss_scores: [],
  cwe_id: '',
  description: '',
  embargoed: false,
  impact: '',
  major_incident_state: '',
  meta: [],
  nvd_cvss3: '',
  source: '',
  title: '',
  type: '',

  owner: '',
  team_id: '',
  summary: '',
  statement: '',
  mitigation: '',
};

const flaw = ref(blankFlaw);

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
    <div v-if="error !== ''" class="alert alert-danger">{{error}}</div>
    <!--<textarea v-bind:value="JSON.stringify(flaw)"/>-->
    <form @submit.prevent="onSubmit">

    <IssueEdit v-model:flaw="flaw" mode="create"/>

    <div class="container">

      <hr class="mt-5">
      <div class="row row-cols-5 action-buttons g-3">
        <button type="submit" class="btn btn-primary col">Create New Flaw</button>
      </div>
    </div>

    </form>
    <pre>{{JSON.stringify(flaw, null, 2)}}</pre>

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
