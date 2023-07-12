<script setup lang="ts">
// EditableText
// Hovering over the text shows an edit button
// Clicking the edit button makes an input field
// Blurring focus or clicking the save button commits the change
// Pressing escape or clicking the abort button aborts the change

import {nextTick, reactive, ref, unref} from 'vue';
import type {MaskaDetail} from 'maska';

const props = defineProps<{
  modelValue: Date,
  time?: boolean,
  editable: boolean,
  editing?: boolean,
}>();

const emit = defineEmits<{
  'update:modelValue': [value: Date],
  'update:editing': [value: boolean],
}>();

const elInput = ref<HTMLInputElement>();
const elDiv = ref<HTMLDivElement>();
const editing = ref<boolean>(props.editing ?? false);
const saveFlashMs = 100;


const editedMaskedModelValue = ref('');
const boundObject = reactive<MaskaDetail>({completed: false, masked: '', unmasked: ''});

const editedModelValue = ref<Date>(unref(props.modelValue));

function beginEdit() {
  editing.value = true;
  nextTick(() => {
    elInput.value?.focus();
  });

}
function commit() {
  editing.value = false;
  emit('update:modelValue', editedModelValue.value);
  console.log('commit');
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

function osimFormatDate(date: Date) {
  return date.toISOString();
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
    <input class="form-control"
           v-maska="boundObject"
           v-model="editedMaskedModelValue"
           @keydown="validateDatePart($event)"
           type="text"
           ref="elInput"
           @blur="blur($event)"
           @keyup.esc="abort"
           data-maska="####-##-##"
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
  <pre>
    Masked value: {{ editedMaskedModelValue }} or {{ boundObject.masked }}
    Unmasked value: {{ boundObject.unmasked }}
    </pre>
  <span v-if="boundObject.completed">✅ Mask completed</span>

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
