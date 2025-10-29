<script setup lang="ts">
import { osimRuntime } from '@/stores/osimRuntime';

const props = withDefaults(defineProps<{
  canShowFeedback: boolean;
  canSuggest: boolean;
  featureFlag?: null | string;
  hasAppliedSuggestion: boolean;
  hasMultipleSuggestions: boolean;
  isFetchingSuggestion: boolean;
  selectedIndex: number;
  suggestions: string[];
  tooltipText: string;
}>(), {
  featureFlag: 'aiCweSuggestions',
});

const emit = defineEmits<{
  feedback: ['negative' | 'positive'];
  revert: [];
  selectSuggestion: [index: number];
  suggest: [];
}>();

function selectSuggestion(index: number) {
  emit('selectSuggestion', index);
}
</script>

<template>
  <div v-if="props.featureFlag && osimRuntime.flags?.[props.featureFlag] === true" class="d-flex align-items-center">
    <i
      class="bi-stars label-icon"
      :class="{ disabled: !canSuggest, applied: hasAppliedSuggestion }"
      :title="tooltipText"
      @click.prevent.stop="canSuggest && emit('suggest')"
    />
    <div
      v-if="hasMultipleSuggestions && !isFetchingSuggestion"
      class="dropdown ms-1"
    >
      <i
        class="bi-chevron-down label-icon dropdown-toggle"
        data-bs-toggle="dropdown"
        data-bs-auto-close="outside"
        aria-expanded="false"
        title="Select from multiple suggestions"
      />
      <ul class="dropdown-menu suggestion-dropdown">
        <li>
          <h6 class="dropdown-header">AI Suggestions</h6>
        </li>
        <li>
          <hr class="dropdown-divider">
        </li>
        <slot
          name="suggestion-item"
          :suggestions="suggestions"
          :selected-index="selectedIndex"
          :select-suggestion="selectSuggestion"
        >
          <li v-for="(suggestion, index) in suggestions" :key="index">
            <button
              class="dropdown-item"
              :class="{ 'active': index === selectedIndex }"
              type="button"
              @click="selectSuggestion(index)"
            >
              <span class="fs-7">{{ suggestion }}</span>
              <span v-if="index === selectedIndex" class="text-success">
                <i class="bi-check-square-fill fs-5"></i>
              </span>
            </button>
          </li>
        </slot>
      </ul>
    </div>
    <span v-if="canShowFeedback && !isFetchingSuggestion" class="ms-2">
      <i
        class="bi-arrow-counterclockwise label-icon"
        title="Revert to previous value"
        @click.prevent.stop="emit('revert')"
      />
      <i
        class="bi-hand-thumbs-up label-icon"
        title="Mark suggestion helpful"
        @click.prevent.stop="emit('feedback', 'positive')"
      />
      <i
        class="bi-hand-thumbs-down label-icon"
        title="Mark suggestion unhelpful"
        @click.prevent.stop="emit('feedback', 'negative')"
      />
    </span>
  </div>
</template>

<style scoped lang="scss">
.label-icon {
  color: gray;
  margin-right: 0.5rem;
  cursor: pointer;

  &.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &.applied {
    color: black;
  }

  &:hover:not(.disabled) {
    color: #333;
  }
}

.suggestion-dropdown {
  min-width: 200px;
  max-height: 300px;
  overflow-y: auto;
  font-size: 0.875rem;

  .dropdown-header {
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
  }

  :deep(.dropdown-item) {
    padding: 0.35rem 0.5rem;
    border-bottom: 1px solid #f8f9fa;
    display: flex;
    align-items: center;
    gap: 0.5rem;

    &:last-child {
      border-bottom: none;
    }

    &.active {
      background-color: #d1f0d4;
      border-left: 3px solid #198754;
      color: #212529;
    }

    &:active,
    &:focus {
      background-color: #d1f0d4 !important;
      color: #212529 !important;
    }
  }
}
</style>
