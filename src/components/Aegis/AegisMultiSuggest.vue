<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import { onClickOutside } from '@vueuse/core';

import type { FullFlawSuggestions, SuggestionField } from '@/composables/aegis/useFullFlawSuggestions';
import type { AegisSteeringNotes } from '@/composables/aegis/useAegisSteeringNotes';

import LoadingSpinner from '@/widgets/LoadingSpinner/LoadingSpinner.vue';

const props = defineProps<{
  coordinator: FullFlawSuggestions;
  disabled: boolean;
  steeringNotes: AegisSteeringNotes;
}>();

const dropdown = ref<HTMLElement>();
const trigger = ref<HTMLButtonElement>();
const isOpen = ref(false);
const choices = ref<null | SuggestionField[]>(null);
const selectedFields = computed({
  get: () => choices.value ?? props.coordinator.fields.value.filter(item => item.isEmpty).map(item => item.field),
  set: (fields: SuggestionField[]) => { choices.value = fields; },
});
const isDisabled = computed(() => props.disabled || !props.coordinator.canSuggest.value);
const isMenuDisabled = computed(() => props.disabled
  || !props.coordinator.isVisible.value || props.coordinator.isBusy.value);
const notesDraft = computed({
  get: () => props.steeringNotes.draft.value,
  set: (value: string) => props.steeringNotes.setDraft(value),
});
const selectedEnabledFields = computed(() => selectedFields.value.filter(field =>
  props.coordinator.fields.value.some(item => item.field === field),
));
const allSelected = computed(() => props.coordinator.fields.value.length > 0
  && selectedEnabledFields.value.length === props.coordinator.fields.value.length);

onClickOutside(dropdown, () => { isOpen.value = false; });
watch(isMenuDisabled, (disabled) => {
  if (disabled) isOpen.value = false;
});

function toggle() {
  if (isMenuDisabled.value) return;
  if (!isOpen.value && choices.value === null) {
    selectedFields.value = [...selectedFields.value];
  }
  isOpen.value = !isOpen.value;
}

function close() {
  isOpen.value = false;
  trigger.value?.focus();
}

function toggleAll() {
  selectedFields.value = allSelected.value ? [] : props.coordinator.fields.value.map(item => item.field);
}

function submit() {
  if (isDisabled.value || !selectedEnabledFields.value.length) return;
  close();
  props.coordinator.suggestAll(selectedEnabledFields.value);
}
</script>

<template>
  <div ref="dropdown" class="dropdown" @keydown.esc.stop.prevent="close">
    <div class="btn-group my-0">
      <button
        type="button"
        class="btn btn-secondary my-0"
        :disabled="isDisabled || !selectedEnabledFields.length"
        :aria-busy="coordinator.isFetching.value"
        @click="submit"
      >
        <LoadingSpinner v-if="coordinator.isFetching.value" type="border" class="me-2" />
        <i v-else class="bi bi-stars text-warning me-2" aria-hidden="true" />
        Multi Suggest
      </button>
      <button
        ref="trigger"
        type="button"
        class="btn btn-secondary dropdown-toggle dropdown-toggle-split my-0"
        :disabled="isMenuDisabled"
        :aria-expanded="isOpen"
        aria-label="Choose suggestion fields"
        @click="toggle"
      ></button>
    </div>
    <div v-if="isOpen" class="dropdown-menu dropdown-menu-end show multi-suggest-menu p-2 text-start">
      <table class="table table-sm align-middle mb-0">
        <thead>
          <tr>
            <th scope="col" class="text-center">
              <button
                type="button"
                class="btn btn-primary text-white border-0 multi-suggest-select-all"
                :title="allSelected ? 'Unselect all' : 'Select all'"
                :aria-label="allSelected ? 'Unselect all suggestion fields' : 'Select all suggestion fields'"
                @click="toggleAll"
              >
                <i class="bi" :class="allSelected ? 'bi-x' : 'bi-check-all'" aria-hidden="true" />
              </button>
            </th>
            <th scope="col">Suggestion field</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in coordinator.fields.value" :key="item.field">
            <td class="text-center">
              <input
                :id="`multi-suggest-${item.field}`"
                v-model="selectedFields"
                type="checkbox"
                class="form-check-input"
                :value="item.field"
              >
            </td>
            <td>
              <label
                :for="`multi-suggest-${item.field}`"
                :class="{'fst-italic': !item.isEmpty && selectedFields.includes(item.field)}"
              >
                {{ item.label }}{{ !item.isEmpty && selectedFields.includes(item.field) ? ' (override)' : '' }}
              </label>
            </td>
          </tr>
        </tbody>
      </table>
      <div class="border-top mt-2 pt-2">
        <label class="d-block">
          <span class="form-label">Steering notes (internal)</span>
          <textarea
            v-model="notesDraft"
            class="form-control"
            rows="5"
            :disabled="isMenuDisabled"
          ></textarea>
        </label>
        <p class="form-text mb-2">
          Save notes to use them in Aegis suggestions. Use the form's Save Changes to persist them.
        </p>
        <div class="d-flex gap-2">
          <button
            type="button"
            class="btn btn-primary btn-sm my-0"
            :disabled="isMenuDisabled || !steeringNotes.hasChanges.value"
            @click="steeringNotes.save"
          >Save notes</button>
          <button
            type="button"
            class="btn btn-secondary btn-sm my-0"
            :disabled="isMenuDisabled || !notesDraft.length"
            @click="steeringNotes.clear"
          >Clear</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.multi-suggest-select-all {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: calc(1em + 4px);
  height: calc(1em + 4px);
  padding: 2px;
  border-radius: 0.25em;
  line-height: 1;
}

.multi-suggest-menu {
  right: 0;
  left: auto;
  width: 26rem;
  max-width: calc(100vw - 2rem);
}
</style>
