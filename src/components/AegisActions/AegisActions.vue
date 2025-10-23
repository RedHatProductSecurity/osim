<script setup lang="ts">
import { ref, watch } from 'vue';

import { osimRuntime } from '@/stores/osimRuntime';

const props = defineProps<{
  canShowFeedback: boolean;
  canSuggest: boolean;
  hasAppliedSuggestion: boolean;
  hasMultipleSuggestions: boolean;
  isSuggesting: boolean;
  selectedIndex: number;
  suggestions: string[];
  tooltipText: string;
}>();

const emit = defineEmits<{
  feedback: ['negative' | 'positive'];
  revert: [];
  selectSuggestion: [index: number];
  suggest: [];
}>();

const showDropdown = ref(false);

watch(() => props.isSuggesting, newValue => newValue && (showDropdown.value = false));

function toggleDropdown() {
  showDropdown.value = !showDropdown.value;
}

function selectSuggestion(index: number) {
  emit('selectSuggestion', index);
  showDropdown.value = false;
}

function handleDropdownBlur(event: FocusEvent) {
  const currentTarget = event.currentTarget as HTMLElement;
  const relatedTarget = event.relatedTarget as HTMLElement;

  if (!currentTarget.contains(relatedTarget)) {
    showDropdown.value = false;
  }
}
</script>

<template>
  <div v-if="osimRuntime.flags?.aiCweSuggestions === true" class="d-flex align-items-center">
    <i
      class="bi-stars label-icon"
      :class="{ disabled: !canSuggest, applied: hasAppliedSuggestion }"
      :title="tooltipText"
      @click.prevent.stop="canSuggest && emit('suggest')"
    />
    <div
      v-if="hasMultipleSuggestions && !isSuggesting"
      class="position-relative ms-1"
      tabindex="0"
      @focusout="handleDropdownBlur"
    >
      <i
        class="bi-chevron-down label-icon dropdown-arrow"
        :class="{ 'rotated': showDropdown }"
        title="Select from multiple suggestions"
        @click.prevent.stop="toggleDropdown"
      />
      <div
        v-if="showDropdown"
        class="suggestion-dropdown position-absolute bg-white border rounded shadow-sm"
      >
        <div class="dropdown-header px-2 py-1 bg-light border-bottom">
          <small class="text-muted text-start">AI Suggestions</small>
        </div>
        <slot
          name="suggestion-item"
          :suggestions="suggestions"
          :selected-index="selectedIndex"
          :select-suggestion="selectSuggestion"
        >
          <div
            v-for="(suggestion, index) in suggestions"
            :key="index"
            class="dropdown-item px-2 py-1 cursor-pointer"
            :class="{ 'active': index === selectedIndex }"
            @click.prevent.stop="selectSuggestion(index)"
          >
            <span class="fs-7">{{ suggestion }}</span>
            <span v-if="index === selectedIndex" class="text-success">
              <i class="bi-check-square-fill fs-5"></i>
            </span>
          </div>
        </slot>
      </div>
    </div>
    <span v-if="canShowFeedback && !isSuggesting" class="ms-2">
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

.dropdown-arrow {
  transition: transform 0.2s ease;

  &.rotated {
    transform: rotate(180deg);
  }
}

.suggestion-dropdown {
  top: 100%;
  left: 0;
  min-width: 200px;
  max-height: 200px;
  overflow-y: auto;
  z-index: 1050;
  border: 1px solid #dee2e6;

  .dropdown-header {
    text-align: left;
  }

  .dropdown-item {
    border-bottom: 1px solid #f8f9fa;
    transition: background-color 0.15s ease-in-out;
    text-align: left;
    display: flex;
    justify-content: space-between;
    align-items: center;

    &:hover {
      background-color: #f8f9fa;
    }

    &.active {
      background-color: #e7f3ff;
    }

    &:last-child {
      border-bottom: none;
    }
  }
}

.cursor-pointer {
  cursor: pointer;
}
</style>
