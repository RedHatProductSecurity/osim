<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import { onClickOutside } from '@vueuse/core';

import type { FullFlawSuggestions, SuggestionField } from '@/composables/aegis/useFullFlawSuggestions';

import LoadingSpinner from '@/widgets/LoadingSpinner/LoadingSpinner.vue';

const props = defineProps<{
  coordinator: FullFlawSuggestions;
  disabled: boolean;
}>();

const dropdown = ref<HTMLElement>();
const trigger = ref<HTMLButtonElement>();
const isOpen = ref(false);
const selectedFields = ref<SuggestionField[]>([]);
const isDisabled = computed(() => props.disabled || !props.coordinator.canSuggest.value);
const selectedEnabledFields = computed(() => selectedFields.value.filter(field =>
  props.coordinator.fields.value.some(item => item.field === field),
));

onClickOutside(dropdown, () => { isOpen.value = false; });
watch(isDisabled, (disabled) => {
  if (disabled) isOpen.value = false;
});

function toggle() {
  if (isDisabled.value) return;
  if (!isOpen.value) {
    selectedFields.value = props.coordinator.fields.value.filter(item => item.isEmpty).map(item => item.field);
  }
  isOpen.value = !isOpen.value;
}

function close() {
  isOpen.value = false;
  trigger.value?.focus();
}

function selectAll() {
  selectedFields.value = props.coordinator.fields.value.map(item => item.field);
}

function submit() {
  if (isDisabled.value || !selectedEnabledFields.value.length) return;
  close();
  props.coordinator.suggestAll(selectedEnabledFields.value);
}
</script>

<template>
  <div ref="dropdown" class="dropdown mt-2 align-self-end" @keydown.esc.stop.prevent="close">
    <button
      ref="trigger"
      type="button"
      class="btn btn-warning dropdown-toggle"
      :disabled="isDisabled"
      :aria-expanded="isOpen"
      :aria-busy="coordinator.isFetching.value"
      @click="toggle"
    >
      <LoadingSpinner v-if="coordinator.isFetching.value" type="border" class="me-2" />
      <i v-else class="bi bi-stars me-2" aria-hidden="true" />
      Multi Suggest
    </button>
    <div v-if="isOpen" class="dropdown-menu dropdown-menu-end show multi-suggest-menu p-2 text-start">
      <table class="table table-sm align-middle mb-2">
        <thead>
          <tr>
            <th scope="col">Suggestion field</th>
            <th scope="col" class="text-center">
              <button
                type="button"
                class="btn btn-sm btn-outline-secondary"
                title="Select all"
                aria-label="Select all suggestion fields"
                @click="selectAll"
              >
                <i class="bi bi-check-all" aria-hidden="true" />
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in coordinator.fields.value" :key="item.field">
            <td><label :for="`multi-suggest-${item.field}`">{{ item.label }}</label></td>
            <td class="text-center">
              <input
                :id="`multi-suggest-${item.field}`"
                v-model="selectedFields"
                type="checkbox"
                class="form-check-input"
                :value="item.field"
              >
            </td>
          </tr>
        </tbody>
      </table>
      <button
        type="button"
        class="btn btn-warning w-100"
        :disabled="isDisabled || !selectedEnabledFields.length"
        @click="submit"
      >
        Submit
      </button>
    </div>
  </div>
</template>

<style scoped>
.multi-suggest-menu {
  min-width: 17rem;
  max-width: calc(100vw - 2rem);
}
</style>
