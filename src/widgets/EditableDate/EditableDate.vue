<script setup lang="ts">
// EditableText
// Hovering over the text shows an edit button
// Clicking the edit button makes an input field
// Blurring focus or clicking the save button commits the change
// Pressing escape or clicking the abort button aborts the change

import { ref, nextTick, reactive, watch } from 'vue';

import { DateTime } from 'luxon';
import { IMask } from 'vue-imask';

import { formatDate } from '@/utils/helpers';

const props = defineProps<{
  editing?: boolean;
  error?: null | string;
  includesTime?: boolean;
  modelValue: string | undefined;
  placeholder?: string;
  readOnly?: boolean;
}>();

const emit = defineEmits<{
  'update:editing': [value: boolean];
  'update:modelValue': [value: string | undefined];
}>();

const elInput = ref<HTMLInputElement>();
const elDiv = ref<HTMLDivElement>();
const editing = ref<boolean>(props.editing ?? false);

const maskLayer = {
  mask: Date,
  pattern: props.includesTime ? 'yyyy-MM-dd hh:mm Z' : 'yyyy-MM-dd',
  lazy: false, // shows template ____-__-__
  overwrite: true, // "insert" mode
  min: new Date(1970, 0, 1),
  max: new Date(2999, 0, 1),
  blocks: {
    yyyy: {
      mask: IMask.MaskedRange,
      from: 1970,
      to: 9999,
      maxLength: 4,
    },
    MM: {
      mask: IMask.MaskedRange,
      from: 1,
      to: 12,
      maxLength: 2,
    },
    dd: {
      mask: IMask.MaskedRange,
      from: 1,
      to: 31,
      maxLength: 2,
    },
    hh: {
      mask: IMask.MaskedRange,
      from: 0,
      to: 23,
      maxLength: 2,
    },
    mm: {
      mask: IMask.MaskedRange,
      from: 0,
      to: 59,
      maxLength: 2,
    },
    Z: {
      mask: 'UTC',
    },
  },
  // IMask's complete event depends on format and parse returning valid dates
  format: formatDate,
  parse: parseDate,
  autofix: true,
};

// The assumption is that the Date or String is in UTC
function parseDate(dateString: string): Date {
  const formatString = props.includesTime ? 'yyyy-MM-dd T' : 'yyyy-MM-dd';
  // Remove the static part ' UTC' before parsing
  const cleanedDateString = dateString.replace(' UTC', '').trim();
  return DateTime.fromFormat(cleanedDateString, formatString, { zone: 'utc' }).toJSDate();
}

const maskState = reactive({
  completed: false,
  // Force caret to start of input
  masked: ' ',
  unmasked: '',
});

if (props.modelValue != null) {
  maskState.masked = maskLayer.format(props.modelValue, props.includesTime);
}

// vue-imask Event handler
function onAccept(e: CustomEvent) {
  const maskRef = e.detail;
  maskState.completed = false;
  maskState.masked = maskRef.value;
  maskState.unmasked = maskRef.unmaskedValue;
}

// vue-imask Event handler
function onComplete(e: CustomEvent) {
  const maskRef = e.detail;
  maskState.completed = true;
  maskState.masked = maskRef.value;
  maskState.unmasked = maskRef.unmaskedValue;
}

function beginEdit() {
  if (props.readOnly) {
    return;
  }
  editing.value = true;
  nextTick(() => {
    if (elInput.value != null) {
      elInput.value.focus();
      const maskRef = (elInput.value as any).maskRef;
      maskRef?.updateValue();
      maskState.masked = maskRef?.value;
      maskState.unmasked = maskRef?.unmaskedValue;
      maskState.completed = maskRef?.masked.isComplete;
    }
  });
}

function commit() {
  editing.value = false;
  if (!maskState.completed) {
    emit('update:modelValue', undefined);
    return;
  }
  const date = parseDate(maskState.masked); // Use parseDate to get the Date object
  if (!isValidDate(date)) {
    emit('update:modelValue', undefined);
  } else {
    emit('update:modelValue', date.toISOString());
  }
}

function abort() {
  editing.value = false;
  maskState.masked = props.modelValue || '';
  maskState.unmasked = props.modelValue || '';
}

function onBlur(e: FocusEvent | null) {
  if (e == null || e.currentTarget == null) {
    commit();
    return;
  }

  if (e.relatedTarget == null && editing.value) {
    commit();
    return;
  }

  if (e.relatedTarget instanceof Node) {
    if (elDiv.value?.contains(e.relatedTarget)) {
      return; // Don't abort or commit if focus is still within the input editing parts of the component
    } else if (editing.value) {
      commit();
      return;
    }
  }
}

function isValidDate(d: Date | string): boolean {
  if (typeof d === 'string') {
    d = parseDate(d);
  }
  return !Number.isNaN(d.getTime());
}

function osimFormatDate(date?: null | string): string {
  if (date == null) {
    return props.placeholder ?? '[No date selected]';
  }

  const formattedDate = formatDate(date, props.includesTime);
  if (!formattedDate) {
    return 'Invalid Date';
  }

  return formattedDate;
}

watch(() => props.modelValue, () => {
  maskState.masked = props.modelValue || '';
});
</script>

<template>
  <!-- for invalid-tooltip positioning -->
  <div class="position-relative col-9 osim-editable-field osim-date">

    <div
      v-if="!editing"
      class="osim-editable-date"
      :tabindex="readOnly ? -1 : 0"
      @focus="beginEdit"
    >
      <span
        class="osim-editable-date-value form-control text-start"
        :class="{'form-control': !readOnly, 'is-invalid': error != null && !readOnly}"
      >{{ osimFormatDate(modelValue) }}</span>
      <button
        v-if="!readOnly"
        type="button"
        class="osim-editable-date-pen input-group-text"
        tabindex="-1"
        @click="beginEdit"
      ><i class="bi bi-pencil"></i></button>
    </div>

    <div
      v-show="editing"
      ref="elDiv"
      class="input-group osim-date-edit-field"
      @blur="onBlur($event)"
    >
      <input
        ref="elInput"
        v-imask="maskLayer"
        class="form-control"
        :class="{'is-invalid': error != null}"
        :readonly="readOnly"
        type="text"
        :value="maskState.masked"
        @blur="onBlur($event)"
        @keyup.esc="abort"
        @complete="onComplete"
        @accept="onAccept"
      />
      <button
        type="button"
        class="input-group-text osim-confirm"
        tabindex="-1"
        @mouseup="commit"
        @blur="onBlur($event)"
      ><i class="bi bi-check"></i></button>
      <button
        type="button"
        class="input-group-text osim-cancel"
        tabindex="-1"
        @mouseup="abort"
        @blur="onBlur($event)"
      ><i class="bi bi-x"></i></button>
    </div>
    <div
      v-if="!readOnly && error"
      class="invalid-tooltip"
    >{{ error }}</div>
  </div>
</template>

<style lang="scss">
@import 'bootstrap/scss/functions';
@import 'bootstrap/scss/variables';
@import 'bootstrap/scss/variables-dark';

//@import "bootstrap/scss/maps";
@import 'bootstrap/scss/mixins';

//@import "bootstrap/scss/utilities";
@import 'bootstrap/scss/forms';

//@import "bootstrap/scss/bootstrap";

.osim-editable-field {
  &:hover .invalid-tooltip {
    display: block;
  }

  .flash-bg-enter-active {
    /* The vue framework checks for root-level transition-duration.
    Without this, the class is not automatically applied for the correct duration.
    Alternatively, :duration="ms" can be set on the Transition component. */
    transition-duration: 200ms;
  }

  .flash-bg-enter-active .osim-editable-date-value {
    transition: background-color 200ms ease-out !important;
  }

  .flash-bg-enter-from .osim-editable-date-value {
    background-color: #f00;
  }

  .flash-bg-leave-from,
  .flash-bg-leave-active,
  .flash-bg-leave-to {
    transition: none !important;
    display: none !important;
  }

  .osim-editable-date {
    @extend .input-group; // Use pure CSS instead of JS for hover
    // Nest these for specificity
    .osim-editable-date-value {
      // border-color: transparent;  // TODO decide to keep the hovering effect?
      @extend .form-control;
    }

    .osim-editable-date-value::before {
      // Prevent field from collapsing when empty
      content: '\a0';
      display: inline-block;
      width: 0;
    }

    .osim-editable-date-pen {
      display: flex;
    }
  }
}
</style>
