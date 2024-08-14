<script setup lang="ts">
// EditableText
// Hovering over the text shows an edit button
// Clicking the edit button makes an input field
// Blurring focus or clicking the save button commits the change
// Pressing escape or clicking the abort button aborts the change

import { nextTick, ref, unref, watch } from 'vue';

const props = defineProps<{
  modelValue: string | null,
  readOnly?: boolean,
  editing?: boolean,
  placeholder?: string,
  error?: string | null,
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string | null],
  'update:editing': [value: string],
}>();

const elInput = ref<HTMLInputElement>();
const elDiv = ref<HTMLDivElement>();
const editing = ref<boolean>(props.editing ?? false);

const editedModelValue = ref<string | null>(unref(props.modelValue));

watch(() => props.modelValue, () => {
  editedModelValue.value = props.modelValue;
});

function beginEdit() {
  editing.value = true;
  nextTick(() => {
    elInput.value?.focus();
  });

}
function commit() {
  editing.value = false;
  emit('update:modelValue', editedModelValue.value);
}
function abort() {
  editing.value = false;
  editedModelValue.value = props.modelValue;
}
function onBlur(e: FocusEvent | null) {
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

</script>

<template>
  <!-- for invalid-tooltip positioning -->
  <div class="position-relative col-9 osim-editable-field osim-text">
    <!--<Transition name="flash-bg" :duration="2000">-->
    <Transition name="flash-bg">
      <div
        v-show="!editing"
        class="osim-editable-text"
        :tabindex="readOnly ? -1 : 0"
        @focus="beginEdit"
      >
        <span
          class="osim-editable-text-value"
          :class="{
            'form-control': !readOnly,
            'is-invalid': error != null
          }"
        >{{ modelValue === '' ? placeholder : modelValue }}</span>
        <!--if a button is inside a label, clicking the label clicks the button?-->
        <button
          v-if="!readOnly"
          type="button"
          class="osim-editable-text-pen input-group-text"
          tabindex="-1"
          @click="beginEdit"
        ><i class="bi bi-pencil"></i></button>
        <slot name="buttons-out-of-editing-mode" v-bind="{ commit, onBlur }"></slot>
      </div>
    </Transition>
    <div
      v-show="editing"
      ref="elDiv"
      class="input-group"
      @blur="onBlur($event)"
    >
      <input
        ref="elInput"
        v-model="editedModelValue"
        class="form-control"
        :class="{'is-invalid': error != null}"
        type="text"
        :placeholder="placeholder"
        @blur="onBlur($event)"
        @keyup.esc="abort"
      />
      <button
        type="button"
        class="input-group-text"
        tabindex="-1"
        @click="commit"
        @blur="onBlur($event)"
      ><i class="bi bi-check"></i></button>
      <button
        type="button"
        class="input-group-text"
        tabindex="-1"
        @click="abort"
        @blur="onBlur($event)"
      ><i class="bi bi-x"></i></button>
      <slot name="buttons-in-editing-mode" v-bind="{ commit, onBlur }"></slot>
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

    .osim-editable-text-value {
      transition: background-color 200ms ease-out !important;
    }
  }

  .flash-bg-enter-from .osim-editable-text-value {
    background-color: #f00;
  }

  .flash-bg-leave-from, .flash-bg-leave-active, .flash-bg-leave-to {
    transition: none !important;
    display: none !important;
  }

  .osim-editable-text {
    @extend .input-group; // Use pure CSS instead of JS for hover
    // Nest these for specificity
    white-space: nowrap;


    .osim-editable-text-value {
      @extend .form-control;

      // border-color: transparent; // TODO decide to keep the hovering effect?
      color: var(--bs-secondary-color);
      text-overflow: ellipsis;
      overflow: hidden;
    }

    .osim-editable-text-value::before {
      // Prevent field from collapsing when empty
      content: '\a0';
      display: inline-block;
      width: 0;
    }

    .osim-editable-text-pen {
      display: flex;
    }
  }
}
</style>
