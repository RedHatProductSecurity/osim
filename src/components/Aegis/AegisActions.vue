<script setup lang="ts">
import { computed, ref } from 'vue';

import AegisFeedbackModal from './AegisFeedbackModal.vue';

const props = defineProps<{
  canShowFeedback: boolean;
  canSuggest: boolean;
  hasAppliedSuggestion: boolean;
  hasMultipleSuggestions: boolean;
  isFetchingSuggestion: boolean;
  isFieldAIBot?: boolean;
  selectedIndex: number;
  suggestions: string[];
  tooltipText: string;
}>();

const emit = defineEmits<{
  feedback: ['negative' | 'positive', string];
  revert: [];
  selectSuggestion: [index: number];
  suggest: [];
}>();

const showFeedbackModal = ref(false);
const showSuggestionTooltip = ref(false);

const hasSuggestionTooltip = computed(() => {
  // Show tooltip when a suggestion has been applied OR when field is AI-Bot highlighted
  return props.hasAppliedSuggestion || props.isFieldAIBot;
});

function toggleSuggestionTooltip() {
  showSuggestionTooltip.value = !showSuggestionTooltip.value;
}

function selectSuggestion(index: number) {
  emit('selectSuggestion', index);
}

function handleThumbsDown() {
  showFeedbackModal.value = true;
}

function handleFeedbackSubmit(comment: string) {
  showFeedbackModal.value = false;
  emit('feedback', 'negative', comment);
}

function handleFeedbackCancel() {
  showFeedbackModal.value = false;
}
</script>

<template>
  <div class="d-flex align-items-center">
    <i
      v-osim-loading.grow="isFetchingSuggestion"
      class="bi-stars label-icon me-1"
      :class="{ disabled: !canSuggest, applied: hasAppliedSuggestion }"
      title="Generate AI suggestion"
      @click.prevent.stop="canSuggest && emit('suggest')"
    />
    <span
      v-if="hasSuggestionTooltip"
      style="position: relative; display: inline-flex; align-items: center;"
    >
      <i
        class="bi bi-info-circle me-1"
        style="cursor: pointer; font-size: 0.9em; color: #6c757d;"
        title="Click to see suggestion details"
        @click.stop="toggleSuggestionTooltip"
      ></i>
      <!-- eslint-disable vue/no-v-html -->
      <div
        v-if="showSuggestionTooltip"
        class="aegis-tooltip"
        v-html="tooltipText.replace(/\n/g, '<br>')"
      ></div>
      <!-- eslint-enable vue/no-v-html -->
    </span>
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
    <span v-if="(hasAppliedSuggestion || canShowFeedback) && !isFetchingSuggestion">
      <i
        v-if="hasAppliedSuggestion"
        class="bi-arrow-counterclockwise label-icon"
        title="Revert to previous value"
        @click.prevent.stop="emit('revert')"
      />
      <template v-if="canShowFeedback">
        <i
          class="bi-hand-thumbs-up label-icon me-1"
          title="Mark helpful"
          @click.prevent.stop="emit('feedback', 'positive', '')"
        />
        <i
          class="bi-hand-thumbs-down label-icon me-1"
          title="Mark unhelpful"
          @click.prevent.stop="handleThumbsDown"
        />
      </template>
    </span>
    <AegisFeedbackModal
      :show="showFeedbackModal"
      @submit="handleFeedbackSubmit"
      @cancel="handleFeedbackCancel"
    />
  </div>
</template>

<style scoped lang="scss">
i.bi-stars {
  position: relative;

  :deep(div[role='status']) {
    position: absolute;
    top: 0.25rem;
    scale: 1.5;
    left: 0;
  }
}

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

.aegis-tooltip {
  position: absolute;
  left: 100%;
  top: 50%;
  transform: translateY(-50%);
  margin-left: 10px;
  background: #333;
  color: white;
  padding: 8px 12px;
  border-radius: 4px;
  min-width: 350px;
  max-width: 500px;
  max-height: 300px;
  overflow-y: auto;
  white-space: normal;
  word-wrap: break-word;
  z-index: 1060;
  box-shadow: 0 2px 8px rgb(0 0 0 / 15%);
  font-size: 0.875rem;
  line-height: 1.4;
  text-align: left;

  &::before {
    content: '';
    position: absolute;
    right: 100%;
    top: 50%;
    transform: translateY(-50%);
    border: 6px solid transparent;
    border-right-color: #333;
  }
}
</style>
