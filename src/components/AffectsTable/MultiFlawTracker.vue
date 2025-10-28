<script setup lang="ts">
import { computed, ref } from 'vue';

import { useMultiFlawTrackers } from '@/composables/useMultiFlawTrackers';

import DropDownMenu from '@/widgets/DropDownMenu/DropDownMenu.vue';

const {
  actions: { addFlaw: addFlawAction, removeFlaw, validateId },
  computed: { cveStreamCount },
  state: { relatedAffects },
} = useMultiFlawTrackers();

const searchFilter = ref<string>('');

const isSearchValid = computed(() => {
  const trimmed = searchFilter.value.trim();
  return trimmed.length > 0 && validateId(trimmed);
});

function addFlaw() {
  const trimmed = searchFilter.value.trim();
  if (trimmed && validateId(trimmed)) {
    addFlawAction(trimmed);
    searchFilter.value = '';
  }
}

function handlePaste(event: ClipboardEvent) {
  const pastedText = event.clipboardData?.getData('text') || '';
  const entries = pastedText
    .split(/[\n,\s]+/)
    .map(entry => entry.trim())
    .filter(entry => entry.length > 0);

  if (entries.length <= 1) return;

  event.preventDefault();

  entries.forEach((entry) => {
    if (validateId(entry)) {
      addFlawAction(entry);
    }
  });

  searchFilter.value = '';
}
</script>

<template>
  <DropDownMenu>
    <template #trigger>
      <button
        type="button"
        title="Open Tracker Manager"
        class="btn btn-secondary text-nowrap"
      ><i class="bi-collection-fill" />
      </button>
    </template>
    <template #content>
      <ul class="list-unstyled">
        <li class="dropdown-item bg-white">
          <div class="input-group">
            <input
              v-model="searchFilter"
              class="border border-info px-1 focus-ring focus-ring-info"
              type="text"
              placeholder="CVE or Flaw UUID"
              @keypress.enter="isSearchValid && addFlaw()"
              @paste="handlePaste"
            />
            <button
              :disabled="!isSearchValid"
              class="btn btn-info btn-sm font-white"
              type="button"
              @click="addFlaw()"
            >
              Add
            </button>
          </div>
        </li>
        <li><hr class="dropdown-divider"></li>
        <li v-if="relatedAffects.size === 0" class="dropdown-item bg-white text-secondary text-center">
          Add a CVE to file related trackers
        </li>
        <li
          v-for="[identifier, status] in relatedAffects"
          :key="identifier"
          class="dropdown-item bg-white text-uppercase d-flex justify-content-between align-items-center"
        >
          {{ identifier }}
          <div v-if="status==='loading'" class="spinner-border spinner-border-sm" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
          <div v-else-if="status!=='error'" class="d-flex">
            <span class="badge bg-secondary me-3" title="Number of streams shared with current Flaw">
              {{ cveStreamCount[identifier] ?? 0 }}
            </span>
            <div role="button" @click="removeFlaw(identifier)">
              <i class="bi-x"></i>
            </div>
          </div>
        </li>
        <template v-if="relatedAffects.size > 0">
          <li><hr class="dropdown-divider"></li>
          <li class="dropdown-item bg-white">
            <button type="button" class="btn btn-secondary btn-sm float-end" @click="relatedAffects.clear()">
              Reset
            </button>
          </li>
        </template>
      </ul>
    </template>
  </DropDownMenu>
</template>
