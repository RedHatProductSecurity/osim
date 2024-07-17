<script setup lang="ts">
import { ref, watch } from 'vue';

import { useToastStore } from '@/stores/ToastStore';
import { getDisplayedOsidbError } from '@/services/osidb-errors-helpers';
import type { ZodFlawType } from '@/types/zodFlaw';

import { getFlaw, getRelatedFlaws } from '../services/FlawService';
import FlawForm from '../components/FlawForm.vue';

const props = defineProps<{
  id: string;
}>();

const relatedFlaws = ref<ZodFlawType[]>([]);

const flaw = ref<null | ZodFlawType>(null);
const errorLoadingFlaw = ref(false);
const { addToast } = useToastStore();

fetchFlaw();

watch(() => props.id, fetchFlaw);

function fetchFlaw() {
  errorLoadingFlaw.value = false;
  getFlaw(props.id)
    .then((theFlaw) => {
      flaw.value = Object.assign({}, theFlaw);
      getRelatedFlaws(theFlaw.affects)
        .then((flaws) => {
          console.log('relatedFlaws', flaws);
          relatedFlaws.value = flaws;
        })
        .catch(console.error)
        .finally(() => {
          history.replaceState(null, '', `/flaws/${(theFlaw.cve_id || theFlaw.uuid)}`);
        });
    })
    .catch((err) => {
      errorLoadingFlaw.value = true;
      flaw.value = null;
      addToast({
        title: 'Error loading Flaw',
        body: getDisplayedOsidbError(err),
      });
      console.error('FlawEditView::refreshFlaw() Error loading flaw', err);
    });
}
</script>

<template>
  <main>
    <FlawForm
      v-if="flaw"
      :key="`${flaw.uuid}-${flaw.updated_dt}`"
      v-model:flaw="flaw"
      :relatedFlaws="relatedFlaws"
      mode="edit"
      @refresh:flaw="fetchFlaw"
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
