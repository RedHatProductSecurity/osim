<script setup lang="ts">
import { ref, watch } from 'vue';
import FlawForm from '../components/FlawForm.vue';
import { getFlaw } from '../services/FlawService';
import { useToastStore } from '@/stores/ToastStore';
import { getDisplayedOsidbError } from '@/services/OsidbAuthService';
import type { ZodFlawType } from '@/types/zodFlaw';

const flaw = ref<ZodFlawType | null>(null);
const committedFlaw = ref<ZodFlawType | null>(null);
const errorLoadingFlaw = ref(false);
const props = defineProps<{
  id: string;
}>();

const { addToast } = useToastStore();

refreshFlaw();

watch(() => props.id, refreshFlaw);

function refreshFlaw() {
  errorLoadingFlaw.value = false;
  getFlaw(props.id)
    .then((theFlaw) => {
      flaw.value = Object.assign({}, theFlaw);
      committedFlaw.value = Object.assign({}, theFlaw);
      history.replaceState(null, '', `/flaws/${(theFlaw.cve_id || theFlaw.uuid)}`);
    })
    .catch((err) => {
      errorLoadingFlaw.value = true;
      flaw.value = null;
      addToast({
        title: 'Error loading Flaw',
        body: getDisplayedOsidbError(err),
      });
      console.error(err);
    });
}
</script>

<template>
  <main>
    <FlawForm
      v-if="flaw"
      v-model:flaw="flaw"
      mode="edit"
      @refresh:flaw="refreshFlaw"
    />
    <div v-if="errorLoadingFlaw">
      <div class="row justify-content-around">
        <div class="m-5 col-lg-6 col-md-8 col-sm-12">
          <div class="alert alert-warning" role="alert">
            Flaw {{ `${props.id}` }} not found.
            <div class="mt-4">
              <RouterLink class="btn btn-primary me-3" to="/flaws/new">Create New Flaw</RouterLink>
              <RouterLink class="btn btn-primary" to="/">See All Flaws</RouterLink>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div v-if="!flaw && !errorLoadingFlaw" class="d-flex justify-content-center m-5">
      <div class="spinner-border" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
    </div>
  </main>
</template>

<style scoped>
.osim-action-buttons {
  background: white;
  border-top: 1px solid #ddd;
  margin-left: 20px;
  margin-right: 20px;
  padding-right: 20px;
  padding-bottom: 2rem;
  padding-top: 0.5rem;
}
</style>
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
