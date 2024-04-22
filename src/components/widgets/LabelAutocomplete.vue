<script setup lang="ts">
// LabelAutocomplete

import { computed, nextTick, ref, unref, watch } from 'vue';

const props = defineProps<{
  modelValue: string | null | undefined,
  label?: string,
  options?: string[] | null | undefined,
  readOnly?: boolean,
  editing?: boolean,
  placeholder?: string,
  error?: string,
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string | null | undefined],
  'update:editing': [value: string],
}>();

const elInput = ref<HTMLInputElement>();
const elDiv = ref<HTMLDivElement>();
const editing = ref<boolean>(props.editing ?? false);

const editedModelValue = ref<string | null | undefined>(unref(props.modelValue));

function getFilteredOptions() {
  if (!props.options) return [];
  if (!editedModelValue.value) return props.options;
  const value = editedModelValue.value.toLowerCase();
  return props.options.filter(option => option.toLowerCase().includes(value.trim()));
}

const filteredOptions = computed(getFilteredOptions);

const exactMatch = computed(() => {
  const value = editedModelValue.value?.toLowerCase();
  return filteredOptions.value.length === 1 && filteredOptions.value[0].toLowerCase() === value;
});

const visibleDropdown = computed(() => {
  return editing.value && !exactMatch.value;
});

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
}

</script>

<template>
  <label class="osim-input ps-3 mb-3 input-group">
    <div class="row">
      <span class="form-label col-3">
        <slot name="label">
          {{ label }}
        </slot>
      </span>
      <div class="position-relative col-9 osim-editable-field osim-text"> 
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
            <button
              v-if="!readOnly"
              type="button"
              class="osim-editable-text-pen input-group-text"
              tabindex="-1"
              @click="beginEdit"
            ><i class="bi bi-pencil"></i></button>
          </div>
        </Transition>
        <div
          v-show="editing"
          ref="elDiv"
          class="input-group"
          @blur="blur($event)"
        >
          <input
            ref="elInput"
            v-model="editedModelValue"
            class="form-control"
            :class="{'is-invalid': error != null}"
            type="text"
            :placeholder="placeholder"
            @blur="blur($event)"
            @keyup.esc="abort"
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
    </div>
    <div 
      v-if="visibleDropdown" 
      class="position-absolute dropdown-menu d-block w-75 mt-1 end-0" 
      style="max-height: 100px; overflow-y: auto;"
    >
      <template v-if="filteredOptions.length > 0">
        <div
          v-for="option in filteredOptions"
          :key="option"
          class="dropdown-item"
          @click.prevent="editedModelValue = option"
          @mousedown="event => event.preventDefault()"
        >
          {{ option }}
        </div>
      </template>
      <template v-else>
        <div class="dropdown-item disabled">No matching options</div>
      </template>
    </div>
  </label>
</template>

<style lang="scss">

@import "bootstrap/scss/functions";
@import "bootstrap/scss/variables";
@import "bootstrap/scss/variables-dark";
@import "bootstrap/scss/mixins";
@import "bootstrap/scss/forms";

.osim-input {
  display: block !important;
}

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
