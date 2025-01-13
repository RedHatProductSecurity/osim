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

const loadCweData = () => {
  const data = localStorage.getItem('CWE:API-DATA');
  if (data) {
    cweData.value = JSON.parse(data);
  }
};

const filterSuggestions = (query: string) => {
  queryRef.value = query;
  const queryParts = queryRef.value.split(/(->|\(|\)|\|)/);
  const lastQueryPart = queryParts[queryParts.length - 1].toLowerCase();
  suggestions.value = cweData.value.filter((cwe: CWEMemberType) => cwe.id.includes(lastQueryPart));
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

onMounted(() => {
  loadCweData();
});
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
        <div
          v-for="(cwe, index) in suggestions"
          :key="index"
          class="item"
          @click.prevent.stop="handleSuggestionClick(abort, `CWE-${cwe.id}`)"
        >
          <span>{{ `CWE-${cwe.id} ${cwe.name}` }}</span>
        </div>
      </template>
    </EditableTextWithSuggestions>
  </LabelDiv>
</template>
