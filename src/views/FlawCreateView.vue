<script setup lang="ts">
import { ref } from 'vue';

import FlawForm from '@/components/FlawForm.vue';
import type { ZodFlawType } from '@/types/zodFlaw';

const error = ref('');

// onMounted(() => {
//   getFlaw(props.id)
//       .then(theFlaw => flaw.value = theFlaw)
//       .catch(err => console.error(err))
// });


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
  type: 'VULNERABILITY', // OSIDB only supports Vulnerabilities at present
  owner: '',
  team_id: '',
  summary: '',
  statement: '',
  mitigation: '',
};

const flaw = ref(blankFlaw);

</script>

<template>
  <main>
    <div v-if="error !== ''" class="alert alert-danger">{{error}}</div>
    <FlawForm v-model:flaw="flaw" mode="create"/>
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
