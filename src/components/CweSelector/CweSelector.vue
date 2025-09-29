<script setup lang="ts">
import { ref, onMounted, nextTick, computed } from 'vue';

import { useAegisSuggestCwe } from '@/composables/aegis/useAegisSuggestCwe';
import type { AegisSuggestionContextRefs } from '@/composables/aegis/useAegisSuggestionContext';

import EditableTextWithSuggestions from '@/widgets/EditableTextWithSuggestions/EditableTextWithSuggestions.vue';
import LabelDiv from '@/widgets/LabelDiv/LabelDiv.vue';
import type { CWEMemberType } from '@/types/mitreCwe';
import { loadCweData } from '@/services/CweService';
import { osimRuntime } from '@/stores/osimRuntime';

const props = withDefaults(defineProps<{
  aegisContext?: AegisSuggestionContextRefs | null;
  error?: null | string;
  label?: string;
}>(), {
  aegisContext: null,
  error: undefined,
  label: '',
});

const modelValue = defineModel<null | string>('modelValue', { default: null });

const queryRef = ref('');

const cweData = ref<CWEMemberType[]>([]);
const suggestions = ref<CWEMemberType[]>([]);
const selectedIndex = ref(-1);

const {
  canShowFeedback,
  canSuggest,
  details: suggestionDetails,
  hasAppliedSuggestion,
  isSuggesting,
  revert: revertCwe,
  sendFeedback,
  suggestCwe,
} = useAegisSuggestCwe({ valueRef: modelValue, context: props.aegisContext as AegisSuggestionContextRefs });

const suggestionTooltip = computed(() => {
  if (!hasAppliedSuggestion.value || !suggestionDetails.value) return 'Suggest CWE via AEGIS-AI';
  const { confidence, cwe, explanation, tools_used } = suggestionDetails.value;
  const parts: string[] = [`Value: ${cwe}`];
  if (confidence != null && confidence !== '') parts.push(`Confidence: ${confidence}`);
  if (explanation) parts.push(`Explanation: ${explanation}`);
  if (tools_used && tools_used.length > 0) {
    parts.push(`Tools Used: ${tools_used.join(', ')}`);
  }
  return parts.join('\n');
});

const filterSuggestions = (query: string) => {
  queryRef.value = query;
  const queryParts = query.toLowerCase().split(/(->|\(|\)|\|)/);
  const lastQueryPart = queryParts[queryParts.length - 1];

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
  cweData.value = loadCweData().filter(({ isProhibited }) => !isProhibited);
});

const usageClassMap: { [key: string]: string } = {
  'allowed': 'text-bg-success',
  'allowed-with-review': 'text-bg-danger',
  'discouraged': 'text-bg-warning',
};
const getUsageClass = (usage: string) => {
  return usageClassMap[usage.toLowerCase()] ?? 'text-bg-secondary';
};
</script>

<template>
  <LabelDiv :label :loading="isSuggesting" class="mb-2">
    <template #labelSlot>
      <i
        v-if="osimRuntime.flags?.aiCweSuggestions === true"
        class="bi-stars label-icon"
        :class="{ disabled: !canSuggest, applied: hasAppliedSuggestion }"
        :title="suggestionTooltip"
        @click.prevent.stop="canSuggest && suggestCwe()"
      />

      <span v-if="canShowFeedback" class="ms-2">
        <i
          class="bi-arrow-counterclockwise label-icon"
          title="Revert to previous CWE"
          @click.prevent.stop="revertCwe"
        />
        <i
          class="bi-hand-thumbs-up label-icon"
          title="Mark suggestion helpful"
          @click.prevent.stop="sendFeedback('up')"
        />
        <i
          class="bi-hand-thumbs-down label-icon"
          title="Mark suggestion unhelpful"
          @click.prevent.stop="sendFeedback('down')"
        />
      </span>
    </template>
    <div tabindex="0" @keydown="handleKeyDown($event)">
      <EditableTextWithSuggestions
        v-model="modelValue"
        :error
        class="col-12"
        :read-only="isSuggesting"
        @update:query="filterSuggestions"
      >
        <template v-if="suggestions.length > 0" #suggestions="{ abort }">
          <div class="dropdown-header">
            <span class="flex-1">ID</span>
            <span class="flex-3">Name</span>
            <span class="flex-1">Usage</span>
            <span class="flex-1"></span>
          </div>
          <div
            v-for="(cwe, index) in suggestions"
            :key="index"
            class="item gap-1 d-flex justify-content-between"
            :class="{'selected': index === selectedIndex, 'disabled': cwe.isDiscouraged }"
            @click.prevent.stop="!cwe.isDiscouraged && handleSuggestionClick(abort, `CWE-${cwe.id}`)"
            @mouseenter="selectedIndex = index"
          >
            <span class="flex-1">{{ `CWE-${cwe.id} ` }}</span>
            <span class="flex-3">{{ `${cwe.name}. ` }}</span>
            <span class="badge flex-1" :class="getUsageClass(cwe.usage)">{{ `${cwe.usage}` }}</span>
            <div class="flex-1">
              <i
                v-show="cwe.summary"
                class="icon bi-info-circle"
                :title="(cwe.isDiscouraged
                  ? `Usage of this CWE is discouraged, use another from the same class (${cwe.category})\n\n`
                  : '') + cwe.summary"
              />
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
    </div>
  </LabelDiv>
</template>

<style scoped lang="scss">
.item {
  &.selected {
    background-color: #dee2e6;
  }

  &.disabled {
    background-color: #e9ecef;
    opacity: 0.8;
    cursor: not-allowed;
  }
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

.label-icon {
  color: gray;
  margin-right: 0.5rem;
  cursor: pointer;
}

.label-icon.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.label-icon.applied {
  color: black;
}
</style>
