<script setup lang="ts">
// EditableText
// Hovering over the text shows an edit button
// Clicking the edit button makes an input field
// Blurring focus or clicking the save button commits the change
// Pressing escape or clicking the abort button aborts the change

import {nextTick, reactive, ref, unref} from 'vue';
import type {MaskaDetail} from 'maska';
import moment from 'moment';
import {IMask} from 'vue-imask';
import {z} from 'zod';

const props = defineProps<{
  modelValue: Date | undefined,
  time?: boolean,
  readOnly?: boolean,
  editing?: boolean,
  error?: string,
}>();

const emit = defineEmits<{
  'update:modelValue': [value: Date | undefined],
  'update:editing': [value: boolean],
}>();

const elInput = ref<HTMLInputElement>();
const elDiv = ref<HTMLDivElement>();
const editing = ref<boolean>(props.editing ?? false);
const saveFlashMs = 100;


const mask = {
  mask: Date, // enable date mask
  pattern: 'Y-`m-`d',  // Pattern mask with defined blocks, default is 'd{.}`m{.}`Y'

  lazy: false, // shows template ____-__-__
  overwrite: true, // "insert" mode
  min: new Date(0),
  max: new Date(9999, 11, 31), // required to complete input
  blocks: {
    Y: {
      mask: IMask.MaskedRange,
      from: 1970,
      to: 9999,
      maxLength: 4,
    },
    m: {
      mask: IMask.MaskedRange,
      from: 1,
      to: 12,
      maxLength: 2,
    },
    d: {
      mask: IMask.MaskedRange,
      from: 1,
      to: 31,
      maxLength: 2,
    },
  },
  // define date -> str conversion
  format: function (date: Date | string) { // required to complete input
    if (typeof date === 'string') {
      date = moment(date).toDate();
    }
    let day = date.getDate();
    let month = date.getMonth() + 1;
    let year = date.getFullYear().toString();
    let dayString = day.toString();
    let monthString = month.toString();
    if (day < 10) {
      dayString = "0" + dayString;
    }
    if (month < 10) {
      monthString = "0" + monthString;
    }

    return [year, monthString, dayString].join('-');
  },
  // define str -> date conversion
  parse: function (str: string) { // required to complete input
    const yearMonthDay = str.split('-');
    return new Date(
        parseInt(yearMonthDay[0], 10),
        parseInt(yearMonthDay[1], 10) - 1,
        parseInt(yearMonthDay[2], 10)
    );
  },

  autofix: true,
};
// const editedMaskedModelValue = ref('');
// const boundObject = reactive<MaskaDetail>({completed: false, masked: '', unmasked: ''});

const editedModelValue = ref<Date | undefined>(unref(props.modelValue));


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
  // console.log('accept', maskRef);
}

function onComplete(e: CustomEvent) {
  const maskRef = e.detail;
  boundObject.completed = true;
  boundObject.masked = maskRef.value;
  boundObject.unmasked = maskRef.unmaskedValue;
  // console.log('complete', maskRef.value);
}

function beginEdit() {
  editing.value = true;
  // elInput.value?.dispatchEvent(new Event('keyup'));
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
    // clear date instead of aborting
    // abort();
    emit('update:modelValue', undefined);
    return;
  }
  const dateRegex = /^(\d\d\d\d)-(\d\d)-(\d\d)/;
  const parsedDate = boundObject.masked.match(dateRegex);
  const date = moment.utc(boundObject.masked).toDate();
  if (!isValidDate(date)) {
    emit('update:modelValue', undefined);
  } else {
    emit('update:modelValue', date);
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
  // if (e.currentTarget.contains(e.relatedTarget)) {
  // || elDiv.value?.contains(e.currentTarget)

  if (e.relatedTarget == null) {
    commit();
    return;
  }

  if (e.relatedTarget instanceof Node) {
    if (elDiv.value?.contains(e.relatedTarget)) {
      // abort();
      // Do not commit or abort while navigating within this component (e.g. with tab or clicking)
      return;
    } else {
      // Commit when focus transfers out of this component
      commit();
      return;
    }
  }

  // if (e.currentTarget instanceof Node) {
  //   if (elDiv.value?.contains(e.currentTarget)) {
  //     abort();
  //     return;
  //   }
  // }
}

function isValidDate(d: Date | string): boolean {
  if (typeof d === 'string') {
    const parsedString = z.string().datetime().safeParse(d);
    return parsedString.success;
  }
  return !isNaN(d.getTime());
}

function osimFormatDate(date: Date | string | undefined | null) {
  if (date == null) {
    return '[No date selected]';
  }
  if (!isValidDate(date)) {
    return 'Invalid Date';
  }
  return moment.utc(date).format('YYYY-MM-DD');
  // return date.toISOString();
}

function validateDatePart(e: KeyboardEvent) {
  console.log(boundObject);
  // if (e.repeat) {
  //   e.preventDefault();
  //   return false;
  // }
  // console.log(e);
  // if (e.currentTarget instanceof HTMLInputElement) {
  //   if (!/\d\d\d\d-\d\d-\d\d/.test(e.currentTarget.value + e.key)) {
  //     e.preventDefault();
  //     return false;
  //   }
  // }
}

</script>

<template>
  <div class="position-relative"> <!-- for invalid-tooltip positioning -->
  <Transition name="flash-bg">
    <div class="osim-editable-date" v-if="!editing" :tabindex="readOnly ? -1 : 0" @focus="beginEdit">
      <span
          class="osim-editable-date-value form-control text-start"
          :class="{'form-control': !readOnly, 'is-invalid': error != null && !readOnly}"
      >{{osimFormatDate(modelValue)}}</span>
      <button
          class="osim-editable-date-pen input-group-text"
          @click="beginEdit"
          v-if="!readOnly"
          tabindex="-1"
      ><i class="bi bi-pencil"></i></button>
    </div>
  </Transition>
  <div class="input-group has-validation"
       v-if="editing"
       @blur="blur($event)"
       ref="elDiv"
  >

    <!--v-maska-->
    <!--@keydown="validateDatePart($event)"-->
    <!--<input class="form-control"-->
    <!--       type="text"-->
    <!--       ref="elInput"-->
    <!--       @blur="blur($event)"-->
    <!--       @keyup.esc="abort"-->

    <!--       v-maska="boundObject"-->
    <!--       data-maska="####-##-##"-->
    <!--/>-->
    <!--vue-imask-->
    <input class="form-control"
           :class="{'is-invalid': error != null}"
           type="text"
           ref="elInput"
           @blur="blur($event)"
           @keyup.esc="abort"
           v-imask="mask"
           :value="boundObject.masked"
           @complete="onComplete"
           @accept="onAccept"
    />
    <button
        class="input-group-text"
        @click="commit"
        @blur="blur($event)"
        tabindex="-1"
    ><i class="bi bi-check"></i></button>
    <button
        class="input-group-text"
        @click="abort"
        @blur="blur($event)"
        tabindex="-1"
    ><i class="bi bi-x"></i></button>
  </div>
  <div
      v-if="!readOnly && error"
      class="invalid-tooltip d-block"
  >{{error}}</div>
  <!--<br/>-->
  <!--<pre>-->
  <!--  Masked value: {{ boundObject.masked }}-->
  <!--  Unmasked value: {{ boundObject.unmasked }}-->
  <!--</pre>-->
  <!--<span v-if="boundObject.completed">✅ Mask completed</span>-->
  </div>
</template>

<style lang="scss">

@import "bootstrap/scss/functions";
@import "bootstrap/scss/variables";
@import "bootstrap/scss/variables-dark";
//@import "bootstrap/scss/maps";
@import "bootstrap/scss/mixins";
//@import "bootstrap/scss/utilities";
@import "bootstrap/scss/forms";

//@import "bootstrap/scss/bootstrap";


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
  background-color: #ff0000;
}
.flash-bg-leave-from, .flash-bg-leave-active, .flash-bg-leave-to {
  transition: none !important;
  display: none !important;
}

.osim-editable-date {
  // Nest these for specificity
  .osim-editable-date-value {
    //border-color: transparent;  // TODO decide to keep the hovering effect?
  }
  .osim-editable-date-value:before {
    // Prevent field from collapsing when empty
    content: '\a0';
    display: inline-block;
    width: 0;
  }

  .osim-editable-date-pen {
    display: none;
  }
}

//.osim-editable-date:hover {  // TODO decide to keep the hovering effect?
.osim-editable-date {
  @extend .input-group; // Use pure CSS instead of JS for hover

  .osim-editable-date-value {
    @extend .form-control;
  }

  .osim-editable-date-pen {
    display: flex;
  }
}

</style>
