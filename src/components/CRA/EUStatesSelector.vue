<script setup lang="ts">
import { computed, ref } from 'vue';

import { EU_MEMBER_STATES, EU_STATE_CODES } from '@/constants/cra';

const props = defineProps<{
  modelValue: string[];
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string[]];
}>();

const showDropdown = ref(false);

const selectedStates = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
});

const availableStates = computed(() =>
  EU_STATE_CODES.filter(code => !selectedStates.value.includes(code)),
);

function addState(code: string) {
  selectedStates.value = [...selectedStates.value, code].sort();
  showDropdown.value = false;
}

function removeState(code: string) {
  selectedStates.value = selectedStates.value.filter(c => c !== code);
}

function selectAll() {
  selectedStates.value = [...EU_STATE_CODES];
  showDropdown.value = false;
}

function clearAll() {
  selectedStates.value = [];
}
</script>

<template>
  <div class="eu-states-selector">
    <!-- Selected states display -->
    <div class="selected-states-container border rounded p-2 mb-2 bg-light">
      <div v-if="selectedStates.length === 0" class="text-muted small">
        No countries selected
      </div>
      <div v-else class="d-flex flex-wrap gap-1">
        <span
          v-for="code in selectedStates"
          :key="code"
          class="badge bg-secondary d-flex align-items-center gap-1"
        >
          {{ code }}
          <button
            type="button"
            class="btn-close btn-close-white"
            style="font-size: 0.6rem"
            :aria-label="`Remove ${code}`"
            @click="removeState(code)"
          ></button>
        </span>
      </div>
    </div>

    <!-- Action buttons -->
    <div class="d-flex gap-2 mb-2">
      <div class="dropdown">
        <button
          type="button"
          class="btn btn-sm btn-secondary dropdown-toggle"
          :disabled="availableStates.length === 0"
          @click="showDropdown = !showDropdown"
        >
          Add Country
        </button>
        <ul
          v-if="showDropdown"
          class="dropdown-menu show"
          style="max-height: 300px; overflow-y: auto"
        >
          <li v-for="code in availableStates" :key="code">
            <a class="dropdown-item" href="#" @click.prevent="addState(code)">
              <strong>{{ code }}</strong> - {{ EU_MEMBER_STATES[code] }}
            </a>
          </li>
        </ul>
      </div>
      <button
        type="button"
        class="btn btn-sm btn-outline-secondary"
        :disabled="selectedStates.length === EU_STATE_CODES.length"
        @click="selectAll"
      >
        Select All ({{ EU_STATE_CODES.length }})
      </button>
      <button
        type="button"
        class="btn btn-sm btn-danger"
        :disabled="selectedStates.length === 0"
        @click="clearAll"
      >
        Clear All
      </button>
    </div>

    <small class="text-muted">
      {{ selectedStates.length }} of {{ EU_STATE_CODES.length }} EU member states selected
    </small>
  </div>
</template>

<style scoped>
.eu-states-selector {
  position: relative;
}

.selected-states-container {
  min-height: 60px;
}

.dropdown-menu.show {
  display: block;
}

.badge .btn-close {
  padding: 0;
  margin: 0;
  width: 0.6rem;
  height: 0.6rem;
}
</style>
