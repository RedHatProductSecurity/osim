<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, useId, watch } from 'vue';

import { createPopper, type Instance as PopperInstance } from '@popperjs/core';
import { onClickOutside } from '@vueuse/core';

import { useFlaw } from '@/composables/useFlaw';

import { useToastStore } from '@/stores/ToastStore';

import AegisFeedbackModal from './AegisFeedbackModal.vue';

const props = defineProps<{
  canShowFeedback: boolean;
  canSuggest: boolean;
  hasAppliedSuggestion: boolean;
  hasMultipleSuggestions: boolean;
  isFetchingSuggestion: boolean;
  isFieldAIBot?: boolean;
  selectedIndex: number;
  skipTooltipText?: string;
  suggestions: string[];
  tooltipText: string;
}>();

const emit = defineEmits<{
  feedback: ['negative' | 'positive', string];
  revert: [];
  selectSuggestion: [index: number];
  suggest: [];
}>();

const EMBARGOED_FEEDBACK_TOOLTIP = 'Aegis feedback is not allowed on embargoed flaws';

const { flaw } = useFlaw();
const isEmbargoed = computed(() => Boolean(flaw.value.embargoed));
const toastStore = useToastStore();

const showFeedbackModal = ref(false);
const showSuggestionTooltip = ref(false);
const suggestionTooltipId = useId();
const suggestionTooltipContainer = ref<HTMLElement>();
const suggestionTooltipTrigger = ref<HTMLElement>();
const suggestionTooltip = ref<HTMLElement>();
const copiedTooltipText = ref<null | string>(null);
let suggestionTooltipPopper: null | PopperInstance = null;

const showSkipWarning = computed(() => !props.hasAppliedSuggestion && !!props.skipTooltipText);
const suggestionTooltipText = computed(() => (showSkipWarning.value ? props.skipTooltipText : props.tooltipText) || '');
const hasCopiedTooltipText = computed(() => copiedTooltipText.value === suggestionTooltipText.value);

const hasSuggestionTooltip = computed(() => {
  return props.hasAppliedSuggestion || props.isFieldAIBot || showSkipWarning.value;
});

onClickOutside(
  suggestionTooltipContainer,
  () => { showSuggestionTooltip.value = false; },
  { ignore: [suggestionTooltip] },
);

watch(showSuggestionTooltip, async (show) => {
  suggestionTooltipPopper?.destroy();
  suggestionTooltipPopper = null;
  if (!show) return;
  await nextTick();
  if (!suggestionTooltipTrigger.value || !suggestionTooltip.value) return;
  suggestionTooltip.value.querySelector<HTMLButtonElement>('button')?.focus();
  suggestionTooltipPopper = createPopper(suggestionTooltipTrigger.value, suggestionTooltip.value, {
    placement: 'right',
    strategy: 'fixed',
    modifiers: [
      { name: 'offset', options: { offset: [0, 10] } },
      { name: 'flip', options: { fallbackPlacements: ['left'] } },
      { name: 'preventOverflow', options: { padding: 8 } },
    ],
  });
});

onBeforeUnmount(() => { suggestionTooltipPopper?.destroy(); });

function toggleSuggestionTooltip() {
  copiedTooltipText.value = null;
  showSuggestionTooltip.value = !showSuggestionTooltip.value;
}

function closeSuggestionTooltip() {
  showSuggestionTooltip.value = false;
  suggestionTooltipTrigger.value?.focus();
}

async function copySuggestionTooltip() {
  const text = suggestionTooltipText.value;
  try {
    await navigator.clipboard.writeText(text);
    copiedTooltipText.value = text;
  } catch {
    copiedTooltipText.value = null;
    toastStore.addToast({
      title: 'Copy failed',
      body: 'Unable to copy text to the clipboard. Please select and copy the text manually.',
      css: 'warning',
    });
  }
}

function handleThumbsUp() {
  if (isEmbargoed.value) return;
  emit('feedback', 'positive', '');
}

function handleThumbsDown() {
  if (isEmbargoed.value) return;
  showFeedbackModal.value = true;
}

function handleFeedbackSubmit(comment: string) {
  showFeedbackModal.value = false;
  emit('feedback', 'negative', comment);
}

function handleFeedbackCancel() {
  showFeedbackModal.value = false;
}

const safeTooltipText = computed(() => {
  const text = suggestionTooltipText.value;
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\n/g, '<br>');
});
</script>

<template>
  <div class="d-flex align-items-center" @click="showSuggestionTooltip = false">
    <!-- @ts-ignore: Global directive -->
    <i
      v-osim-loading.grow="isFetchingSuggestion"
      class="bi-stars label-icon me-1"
      :class="{ disabled: !canSuggest, applied: hasAppliedSuggestion }"
      title="Generate AI suggestion"
      @click.prevent.stop="canSuggest && emit('suggest')"
    />
    <span
      v-if="hasSuggestionTooltip"
      ref="suggestionTooltipContainer"
      style="position: relative; display: inline-flex; align-items: center;"
      @click.stop
      @keydown.esc.stop.prevent="closeSuggestionTooltip"
    >
      <i
        ref="suggestionTooltipTrigger"
        class="bi me-1"
        :class="showSkipWarning ? 'aegis-skip-warning' : 'bi-info-circle text-secondary'"
        style="cursor: pointer; font-size: 0.9em;"
        :title="showSkipWarning
          ? 'Click to see why the AI-Bot suggestion is unavailable'
          : 'Click to see suggestion details'"
        :aria-label="showSkipWarning ? 'AI-Bot suggestion unavailable' : 'AI suggestion details'"
        :aria-describedby="showSuggestionTooltip ? suggestionTooltipId : undefined"
        :aria-expanded="showSuggestionTooltip"
        aria-haspopup="dialog"
        role="button"
        tabindex="0"
        @click.stop.prevent="toggleSuggestionTooltip"
        @keydown.enter.space.stop.prevent="toggleSuggestionTooltip"
      >
        <template v-if="showSkipWarning">
          <i class="bi bi-exclamation-triangle-fill text-warning" aria-hidden="true"></i>
          <i class="bi bi-exclamation-triangle text-black" aria-hidden="true"></i>
        </template>
      </i>
      <Teleport to="body">
        <div
          v-if="showSuggestionTooltip"
          :id="suggestionTooltipId"
          ref="suggestionTooltip"
          class="aegis-tooltip"
          role="dialog"
          :aria-label="showSkipWarning ? 'AI-Bot suggestion unavailable' : 'AI suggestion details'"
          @click.stop
          @keydown.esc.stop.prevent="closeSuggestionTooltip"
          @mousedown.stop
          @mouseup.stop
          @pointerdown.stop
          @pointerup.stop
        >
          <div class="d-flex justify-content-end align-items-center gap-2 mb-2 flex-shrink-0">
            <button
              type="button"
              class="btn btn-sm btn-outline-light m-0 py-0 px-2"
              aria-label="Copy text"
              title="Copy text"
              @click.stop="copySuggestionTooltip"
            >
              <i class="bi me-1" :class="hasCopiedTooltipText ? 'bi-check' : 'bi-clipboard'" aria-hidden="true"></i>
              <span aria-live="polite">{{ hasCopiedTooltipText ? 'Copied text' : 'Copy text' }}</span>
            </button>
            <button
              type="button"
              class="btn-close btn-close-white m-0"
              aria-label="Close suggestion details"
              title="Close"
              @click.stop="closeSuggestionTooltip"
            ></button>
          </div>
          <!-- eslint-disable-next-line vue/no-v-html -->
          <div class="aegis-tooltip-content" v-html="safeTooltipText"></div>
        </div>
      </Teleport>
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
          :select-suggestion="(index: number) => emit('selectSuggestion', index)"
        >
          <li v-for="(suggestion, index) in suggestions" :key="index">
            <button
              class="dropdown-item"
              :class="{ 'active': index === selectedIndex }"
              type="button"
              @click="emit('selectSuggestion', index)"
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
    <span
      v-if="(hasAppliedSuggestion || canShowFeedback) && !isFetchingSuggestion"
      style="display: inline-flex; align-items: center;"
    >
      <i
        v-if="hasAppliedSuggestion"
        class="bi-arrow-counterclockwise label-icon"
        title="Revert to previous value"
        @click.prevent.stop="emit('revert')"
      />
      <template v-if="canShowFeedback">
        <i
          class="bi-hand-thumbs-up label-icon me-1"
          :class="{ disabled: isEmbargoed }"
          :title="isEmbargoed ? EMBARGOED_FEEDBACK_TOOLTIP : 'Mark helpful'"
          :aria-disabled="isEmbargoed"
          @click.prevent.stop="handleThumbsUp"
        />
        <i
          class="bi-hand-thumbs-down label-icon me-1"
          :class="{ disabled: isEmbargoed }"
          :title="isEmbargoed ? EMBARGOED_FEEDBACK_TOOLTIP : 'Mark unhelpful'"
          :aria-disabled="isEmbargoed"
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

.aegis-skip-warning {
  display: inline-grid;

  > .bi {
    grid-area: 1 / 1;
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
  display: flex;
  flex-direction: column;
  background: #333;
  color: white;
  padding: 8px 12px;
  border-radius: 4px;
  min-width: 350px;
  max-width: 500px;
  max-height: 300px;
  pointer-events: auto;
  white-space: normal;
  word-wrap: break-word;
  z-index: 1060;
  box-shadow: 0 2px 8px rgb(0 0 0 / 15%);
  font-size: 0.875rem;
  line-height: 1.4;
  text-align: left;

  &[data-popper-placement^='right']::before,
  &[data-popper-placement^='left']::before {
    content: '';
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    border: 6px solid transparent;
  }

  &[data-popper-placement^='right']::before {
    right: 100%;
    border-right-color: #333;
  }

  &[data-popper-placement^='left']::before {
    left: 100%;
    border-left-color: #333;
  }
}

.aegis-tooltip-content {
  min-height: 0;
  overflow-y: auto;
  cursor: text;
  user-select: text;
}
</style>
