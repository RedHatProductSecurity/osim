<script setup lang="ts">
import {onMounted, ref} from 'vue';
import IssueEdit from '../components/IssueEdit.vue';
import {getFlaw} from '../services/FlawService';
import {useToastStore} from '@/stores/ToastStore';
import {getDisplayedOsidbError} from '@/services/OsidbAuthService';


const flaw = ref(null);
const errorLoadingFlaw = ref(false);
const props = defineProps<{
  id: string,
}>();

const {addToast} = useToastStore();

onMounted(() => {
  getFlaw(props.id)
      .then(theFlaw => flaw.value = theFlaw)
      .catch(err => {
        errorLoadingFlaw.value = true;
        addToast({
          title: 'Error loading Flaw',
          body: getDisplayedOsidbError(err),
        });
        console.error(err);
      })
});

function refreshFlaw() {
  getFlaw(props.id)
      .then(theFlaw => flaw.value = theFlaw)
      .catch(err => {
        errorLoadingFlaw.value = true;
        console.error(err);
      });
}
</script>

<template>
  <main>
    <IssueEdit v-if="flaw" :flaw="flaw" @refresh:flaw="refreshFlaw" />
<!--    <FlawEditForm v-if="flaw" :modelValue="flaw"/>-->
    <div v-if="errorLoadingFlaw">
      Flaw not found
    </div>
    <div v-if="!flaw && !errorLoadingFlaw" class="d-flex justify-content-center m-5">
      <div class="spinner-border" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
    </div>
  </main>
</template>

<!--

Workflow:
1: Load flaw
2: Flaw -> component
3: Component
    edit
    save
4: component -> view
5: view submits

-->
