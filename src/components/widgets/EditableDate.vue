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

const props = defineProps<{
  modelValue: Date | null,
  time?: boolean,
  editable: boolean,
  editing?: boolean,
}>();

const emit = defineEmits<{
  'update:modelValue': [value: Date | null],
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
  format: function (date) { // required to complete input
    let day = date.getDate();
    let month = date.getMonth() + 1;
    let year = date.getFullYear();

    if (day < 10) day = "0" + day;
    if (month < 10) month = "0" + month;

    return [year, month, day].join('-');
  },
  // define str -> date conversion
  parse: function (str) { // required to complete input
    const yearMonthDay = str.split('-');
    return new Date(yearMonthDay[0], yearMonthDay[1] - 1, yearMonthDay[2]);
  },

  autofix: true,
};
// const editedMaskedModelValue = ref('');
// const boundObject = reactive<MaskaDetail>({completed: false, masked: '', unmasked: ''});

const editedModelValue = ref<Date | null>(unref(props.modelValue));


const boundObject = reactive({
  completed: false,
  masked: '',
  unmasked: '',
});

if (props.modelValue != null) {
  boundObject.masked = mask.format(props.modelValue);
}

function onAccept(e) {
  const maskRef = e.detail;
  boundObject.completed = false;
  boundObject.masked = maskRef.value;
  boundObject.unmasked = maskRef.unmaskedValue;
  // console.log('accept', maskRef);
}

function onComplete(e) {
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
      elInput.value.maskRef?.updateValue();
      boundObject.masked = elInput.value.maskRef?.value;
      boundObject.unmasked = elInput.value.maskRef?.unmaskedValue;
      boundObject.completed = elInput.value.maskRef?.masked.isComplete;
    }
  });
}

function commit() {
  console.log('commit');
  editing.value = false;
  if (!boundObject.completed) {
    // clear date instead of aborting
    // abort();
    emit('update:modelValue', null);
    return;
  }
  const dateRegex = /^(\d\d\d\d)-(\d\d)-(\d\d)/;
  const parsedDate = boundObject.masked.match(dateRegex);
  const date = moment.utc(boundObject.masked).toDate();
  if (!isValidDate(date)) {
    emit('update:modelValue', null);
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

function isValidDate(d: Date) {
  return !isNaN(d.getTime());
}

function osimFormatDate(date: Date | null) {
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
  <Transition name="flash-bg">
    <div class="osim-editable-date" v-if="!editing">
      <span
          class="osim-editable-date-value form-control"
          :class="{'form-control': editable}"
      >{{osimFormatDate(modelValue)}}</span>
      <button
          class="osim-editable-date-pen input-group-text"
          @click="beginEdit"
          v-if="editable"
      ><i class="bi bi-pencil"></i></button>
    </div>
  </Transition>
  <div class="input-group"
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
    ><i class="bi bi-check"></i></button>
    <button
        class="input-group-text"
        @click="abort"
        @blur="blur($event)"
    ><i class="bi bi-x"></i></button>
  </div>
  <br/>
  <!--<pre>-->
  <!--  Masked value: {{ boundObject.masked }}-->
  <!--  Unmasked value: {{ boundObject.unmasked }}-->
  <!--</pre>-->
  <!--<span v-if="boundObject.completed">✅ Mask completed</span>-->

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
  background-color: #e8d2d2;
}
.flash-bg-leave-from, .flash-bg-leave-active, .flash-bg-leave-to {
  transition: none !important;
  display: none !important;
}

.osim-editable-date {
  // Nest these for specificity
  .osim-editable-date-value {
    border-color: transparent;
  }

  .osim-editable-date-pen {
    display: none;
  }
}

.osim-editable-date:hover {
  @extend .input-group; // Use pure CSS instead of JS for hover

  .osim-editable-date-value {
    @extend .form-control;
  }

  .osim-editable-date-pen {
    display: flex;
  }
}

</style>
