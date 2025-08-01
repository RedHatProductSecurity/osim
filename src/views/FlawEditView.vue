<script setup lang="ts">
import { computed, watch, onUnmounted } from 'vue';

import FlawForm from '@/components/FlawForm/FlawForm.vue';

import { useFetchFlaw } from '@/composables/useFetchFlaw';
import { useFlaw } from '@/composables/useFlaw';

const props = defineProps<{
  id: string;
}>();

const { resetFlaw } = useFlaw();

const { didFetchFail, fetchFlaw, flaw } = useFetchFlaw();

watch(() => props.id, fetchFlaw, { immediate: true });

onUnmounted(resetFlaw);

const isLoading = computed(() => !flaw.value && !didFetchFail);
</script>

<template>
  <main>
    <FlawForm
      v-if="flaw?.uuid"
      :key="`${flaw.uuid}-${flaw.updated_dt}`"
      mode="edit"
      @refresh:flaw="fetchFlaw(id)"
    />
    <div v-if="didFetchFail">
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
    <div v-if="isLoading" class="d-flex justify-content-center m-5">
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
