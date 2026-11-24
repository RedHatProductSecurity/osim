<script setup lang="ts">
import { type Ref, computed, nextTick, onBeforeUnmount, ref, useId, watch } from 'vue';

import { createPopper, type Instance as PopperInstance } from '@popperjs/core';
import { onClickOutside } from '@vueuse/core';

import { useAegisPendingSuggestion } from '@/composables/aegis/useAegisPendingSuggestion';
import {
  appendAegisSuggestionMetadata,
  withAegisExplanation,
} from '@/composables/aegis/useAegisMetadataTracking';

import { useToastStore } from '@/stores/ToastStore';

const props = defineProps<{
  fieldName: string;
}>();

const modelValue = defineModel<null | string>('modelValue');

const emit = defineEmits<{
  (e: 'update:field', value: null | string | undefined): void;
}>();

watch(modelValue, (newValue) => {
  emit('update:field', newValue);
});

const toastStore = useToastStore();

const {
  accept: acceptSuggestion,
  pendingEntry,
  reject: rejectSuggestion,
} = useAegisPendingSuggestion(props.fieldName, modelValue as Ref<null | string | string[] | undefined>);

const showSuggestionTooltip = ref(false);
const suggestionTooltipId = useId();
const suggestionTooltipContainer = ref<HTMLElement>();
const suggestionTooltipTrigger = ref<HTMLElement>();
const suggestionTooltip = ref<HTMLElement>();
const acceptButton = ref<HTMLButtonElement>();
const copiedTooltipText = ref<null | string>(null);
let suggestionTooltipPopper: null | PopperInstance = null;

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
  acceptButton.value?.focus({ preventScroll: true });
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

// The indicator disappears once the decision is recorded or the value matches.
watch(pendingEntry, (entry) => {
  if (!entry) showSuggestionTooltip.value = false;
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

const suggestedValue = computed(() => {
  const value = pendingEntry.value?.value;
  if (value == null || value === '') return '';
  return Array.isArray(value) ? value.join(', ') : value;
});

const suggestionTooltipText = computed(() => {
  const entry = pendingEntry.value;
  if (!entry) return '';
  const title = 'Aegis-AI-Bot suggestion pending';
  const valueLine = suggestedValue.value ? `Suggested ${props.fieldName}: ${suggestedValue.value}` : '';
  const base = valueLine ? `${title}\n\n${valueLine}` : title;
  return appendAegisSuggestionMetadata(withAegisExplanation(base, entry.explanation), entry);
});

const hasCopiedTooltipText = computed(() => copiedTooltipText.value === suggestionTooltipText.value);

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

function handleAccept() {
  acceptSuggestion();
  closeSuggestionTooltip();
}

function handleReject() {
  rejectSuggestion();
  closeSuggestionTooltip();
}
</script>

<template>
  <span
    v-if="pendingEntry"
    ref="suggestionTooltipContainer"
    style="position: relative; display: inline-flex; align-items: center;"
    @click.stop
    @keydown.esc.stop.prevent="closeSuggestionTooltip"
  >
    <i
      ref="suggestionTooltipTrigger"
      class="bi bi-hourglass-split text-info me-1"
      style="cursor: pointer; font-size: 0.9em;"
      title="AI-Bot suggestion pending — click to review"
      aria-label="AI-Bot suggestion pending — click to review"
      :aria-describedby="showSuggestionTooltip ? suggestionTooltipId : undefined"
      :aria-expanded="showSuggestionTooltip"
      aria-haspopup="dialog"
      role="button"
      tabindex="0"
      @click.stop.prevent="toggleSuggestionTooltip"
      @keydown.enter.space.stop.prevent="toggleSuggestionTooltip"
    ></i>
    <Teleport to="body">
      <div
        v-if="showSuggestionTooltip"
        :id="suggestionTooltipId"
        ref="suggestionTooltip"
        class="aegis-tooltip"
        role="dialog"
        aria-label="Aegis-AI-Bot suggestion pending"
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
        <div class="d-flex gap-2 mt-2 flex-shrink-0">
          <button
            ref="acceptButton"
            type="button"
            class="btn btn-sm btn-success m-0"
            title="Apply the suggested value"
            @click.stop="handleAccept"
          >
            Accept
          </button>
          <button
            type="button"
            class="btn btn-sm btn-outline-light m-0"
            title="Dismiss the suggested value"
            @click.stop="handleReject"
          >
            Reject
          </button>
        </div>
      </div>
    </Teleport>
  </span>
</template>

<style scoped lang="scss">
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
