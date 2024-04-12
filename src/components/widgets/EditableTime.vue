<script setup lang="ts">
// EditableTime
// Hovering over the text shows an edit button
// Clicking the edit button makes an input field
// Blurring focus or clicking the save button commits the change
// Pressing escape or clicking the abort button aborts the change

import { DateTime } from 'luxon';
import { ref, nextTick, reactive, unref } from 'vue';
import { IMask } from 'vue-imask';

const props = defineProps<{
    modelValue: string | undefined,
    time?: boolean,
    readOnly?: boolean,
    editing?: boolean,
    error?: string,
}>();

const emit = defineEmits<{
    'update:modelValue': [value: string | undefined],
    'update:editing': [value: boolean],
}>();


const elInput = ref<HTMLInputElement>();
const elDiv = ref<HTMLDivElement>();
const editing = ref<boolean>(props.editing ?? false);


const mask = {
    mask: Date, // enable date mask
    pattern: 'H:`m:`s',  // Pattern mask with defined blocks
    lazy: false, // shows template __:__:__
    overwrite: true, // "insert" mode
    blocks: {
        H: {
            mask: IMask.MaskedRange,
            from: 0,
            to: 23,
            maxLength: 2,
        },
        m: {
            mask: IMask.MaskedRange,
            from: 0,
            to: 59,
            maxLength: 2,
        },
        s: {
            mask: IMask.MaskedRange,
            from: 0,
            to: 59,
            maxLength: 2,
        }
    },
    // define date -> str conversion
    format: function (date: Date | string) { // required to complete input
        return formatDate(date);
    },
    // define str -> date conversion
    parse: function (str: string) { // required to complete input
        return parseDate(str);
    },

    autofix: true
};
const editedModelValue = ref<string | undefined>(unref(props.modelValue));

const boundObject = reactive({
    completed: false,
    masked: '',
    unmasked: '',
});

if (props.modelValue != null) {
    boundObject.masked = mask.format(props.modelValue);
}

function onAccept(e: CustomEvent) {
    const maskRef = e.detail;
    boundObject.completed = false;
    boundObject.masked = maskRef.value;
    boundObject.unmasked = maskRef.unmaskedValue;
    //console.log('accept', maskRef);
}

function onComplete(e: CustomEvent) {
    const maskRef = e.detail;
    boundObject.completed = true;
    boundObject.masked = maskRef.value;
    boundObject.unmasked = maskRef.unmaskedValue;
    //console.log('complete', maskRef.value);
}

function beginEdit() {
    if (props.readOnly) {
        return;
    }
    editing.value = true;
    nextTick(() => {
        if (elInput.value != null) {
            elInput.value.focus();
            let maskRef = (elInput.value as any).maskRef;
            maskRef?.updateValue();
            boundObject.masked = maskRef?.value;
            boundObject.unmasked = maskRef?.unmaskedValue;
            boundObject.completed = maskRef?.masked.isComplete;
        }
    });
}

function commit() {
    console.log('commit');
    editing.value = false;
    if (!boundObject.completed) {
        emit('update:modelValue', undefined);
        return;
    }
    const date = parseDate(boundObject.masked); // Use parseDate to get the Date object
    if (!isValidDate(date)) {
        emit('update:modelValue', undefined);
    } else {
        console.log("commit: " + date.toISOString());
        emit('update:modelValue', date.toISOString());
    }
}

function abort() {
    editing.value = false;
    editedModelValue.value = props.modelValue;
    console.log('abort');
}

function blur(e: FocusEvent | null) {
    if (e == null || e.currentTarget == null) {
        commit();
        return;
    }

    if (e.relatedTarget == null) {
        commit();
        return;
    }

    if (e.relatedTarget instanceof Node) {
        if (elDiv.value?.contains(e.relatedTarget)) {
            // Do not commit or abort while navigating within this component (e.g. with tab or clicking)
            return;
        } else {
            // Commit when focus transfers out of this component
            commit();
            return;
        }
    }
}

// This function takes a Date or string and returns it in the 'HH:mm:ss' format.
function formatDate(input: Date | string): string {
    const dt = DateTime.fromJSDate(new Date(input)).toUTC();
    // returns in 'HH:mm:ss' format without Z and milliseconds
    const result = dt.toISOTime({ suppressMilliseconds: true, includeOffset: false });
    console.log(result);
    return result || '';
}

// This function takes a string in 'HH:mm:ss' format and returns a Date object.
function parseDate(input: string): Date {
    return DateTime.fromISO(input, { zone: 'utc' }).toISOTime();
}

function isValidDate(d: Date | string): boolean {
    if (typeof d === 'string') {
        d = parseDate(d);
    }
    return !isNaN(d.getTime());
}

function osimFormatDate(date: Date | string | undefined | null): string {
    if (date == null) {
        return '[No time selected]';
    }
    
    const formattedDate = formatDate(date); // Use the new formatDate function
    if (!formattedDate) {
        return 'Invalid Time';
    }

    return formattedDate;
}
</script>

<template>
  <!-- for invalid-tooltip positioning -->
  <div class="position-relative col-9 osim-editable-field osim-date">
      <Transition name="flash-bg">
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
      </Transition>
      <div
          v-if="editing"
          ref="elDiv"
          class="input-group has-validation"
          @blur="blur($event)"
          >
          <input
              ref="elInput"
              v-imask="mask"
              class="form-control"
              :class="{'is-invalid': error != null}"
              :readonly="readOnly"
              type="text"
              :value="boundObject.masked"
              @blur="blur($event)"
              @keyup.esc="abort"
              @complete="onComplete"
              @accept="onAccept"
              />
          <button
              type="button"
              class="input-group-text"
              tabindex="-1"
              @click="commit"
              @blur="blur($event)"
              ><i class="bi bi-check"></i></button>
          <button
              type="button"
              class="input-group-text"
              tabindex="-1"
              @click="abort"
              @blur="blur($event)"
              ><i class="bi bi-x"></i></button>
      </div>
      <div
          v-if="!readOnly && error"
          class="invalid-tooltip"
          >{{ error }}</div>
  </div>
</template>

<style lang="scss">

@import "bootstrap/scss/functions";
@import "bootstrap/scss/variables";
@import "bootstrap/scss/variables-dark";
@import "bootstrap/scss/mixins";
@import "bootstrap/scss/forms";

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

    .flash-bg-leave-from, .flash-bg-leave-active, .flash-bg-leave-to {
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
