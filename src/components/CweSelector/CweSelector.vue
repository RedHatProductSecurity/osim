<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue';

import EditableTextWithSuggestions from '@/widgets/EditableTextWithSuggestions/EditableTextWithSuggestions.vue';
import LabelDiv from '@/widgets/LabelDiv/LabelDiv.vue';
import type { CWEMemberType } from '@/types/mitreCwe';

const props = withDefaults(defineProps<{
  error?: null | string;
  label?: string;
}>(), {
  label: '',
  error: undefined,
});

const modelValue = defineModel<null | string>('modelValue', { default: null });

const queryRef = ref('');

const cweData = ref<CWEMemberType[]>([]);
const suggestions = ref<CWEMemberType[]>([]);
const selectedIndex = ref(-1);

const loadCweData = () => {
  const data = localStorage.getItem('CWE:API-DATA');
  if (data) {
    cweData.value = JSON.parse(data);
  }
};

const filterSuggestions = (query: string) => {
  queryRef.value = query;
  const lastQueryPart = query.toLowerCase();

  suggestions.value = cweData.value.filter(
    (cwe: CWEMemberType) =>
      cwe.id.toLowerCase().includes(lastQueryPart)
      || `CWE-${cwe.id}`.toLowerCase().includes(lastQueryPart)
      || cwe.name.toLowerCase().includes(lastQueryPart)
      || cwe.status.toLowerCase().includes(lastQueryPart)
      || cwe.usage.toLowerCase().includes(lastQueryPart),
  );

  if (suggestions.value.length === 0) {
    suggestions.value = cweData.value;
  }
};

const handleSuggestionClick = (fn: (args?: any) => void, suggestion: string) => {
  const queryParts = queryRef.value.split(/(->|\(|\)|\|)/);
  const lastIndex = queryParts.length - 1;
  queryParts[lastIndex] = suggestion;
  modelValue.value = queryParts.join('');
  queryRef.value = modelValue.value;
  suggestions.value = [];
  nextTick(fn);
};

const handleKeyDown = (event: KeyboardEvent) => {
  if (suggestions.value.length === 0) return;

  switch (event.key) {
    case 'ArrowDown':
      selectedIndex.value = (selectedIndex.value + 1) % suggestions.value.length;
      break;
    case 'ArrowUp':
      selectedIndex.value = (selectedIndex.value - 1 + suggestions.value.length) % suggestions.value.length;
      break;
    case 'Enter':
      if (selectedIndex.value >= 0 && selectedIndex.value < suggestions.value.length) {
        handleSuggestionClick(() => {}, `CWE-${suggestions.value[selectedIndex.value].id}`);
      }
      break;
  }
};

onMounted(() => {
  loadCweData();
  window.addEventListener('keydown', handleKeyDown);
});

const getUsageClass = (usage: string) => {
  switch (usage.toLowerCase()) {
    case 'prohibited':
      return 'badge-red';
    case 'allowed':
      return 'badge-green';
    case 'allowed-with-review':
      return 'badge-yellow';
    case 'discouraged':
      return 'badge-orange';
    default:
      return 'badge-gray';
  }
};
</script>

<template>
  <LabelDiv :label="props.label" class="mb-2">
    <EditableTextWithSuggestions
      v-model="modelValue"
      :error="props.error"
      class="col-12"
      @update:query="filterSuggestions"
    >
      <template v-if="suggestions.length > 0" #suggestions="{ abort }">
        <div class="dropdown-header">
          <span style="flex: 1;">ID</span>
          <span style="flex: 3;">Name</span>
          <!-- <span style="flex: 1;">Status</span> -->
          <span style="flex: 1;">Usage</span>
          <span style="flex: 1;"></span>
        </div>
        <div
          v-for="(cwe, index) in suggestions"
          :key="index"
          class="item gap-1"
          :class="{'selected': index === selectedIndex }"
          style="display: flex; justify-content: space-between;"
          @click.prevent.stop="handleSuggestionClick(abort, `CWE-${cwe.id}`)"
          @mouseenter="selectedIndex = index"
        >
          <span style="flex: 1;">{{ `CWE-${cwe.id} ` }}</span>
          <span style="flex: 3;">{{ `${cwe.name}. ` }}</span>
          <!-- <span style="flex: 1;">{{ `${cwe.status} ` }}</span> -->
          <span class="badge" :class="getUsageClass(cwe.usage)" style="flex: 1;">{{ `${cwe.usage}` }}</span>
          <div style="flex: 1;">
            <i v-show="cwe.summary != ''" class="icon bi-info-circle" :title="cwe.summary" />
            <a
              :href="`https://cwe.mitre.org/data/definitions/${cwe.id}.html`"
              class="icon"
              target="_blank"
              @click.stop
            ><i class="bi-box-arrow-up-right" title="View on Mitre" /></a>
          </div>
        </div>
      </template>
    </EditableTextWithSuggestions>
  </LabelDiv>
</template>

<style scoped lang="scss">
.item.selected {
  background-color: #dee2e6;
}

.dropdown-header {
  display: flex;
  justify-content: space-between;
  position: sticky;
  top: -0.5rem !important;
  z-index: 1;
  padding: 0.5rem 1rem;
  background-color: #f8f9fa;
  font-weight: bold;

  &:hover {
    background-color: #f8f9fa;
    cursor: default;
  }
}

.badge {
  word-break: break-all;
  white-space: normal;
}

.badge-red {
  background-color: #dc3545;
  color: white;
}

.badge-green {
  background-color: #28a745;
  color: white;
}

.badge-orange {
  background-color: #fd7e14;
  color: black;
}

.badge-yellow {
  background-color: #ffc107;
  color: black;
}

.icon {
  color: gray;
  font-size: 1.25rem;
  float: right;
  margin-left: 0.5rem;
}
</style>
