<script setup lang="ts">

defineProps<{
  modelValue: string[],
  error?: string,
}>();
const emit = defineEmits<{
  'update:modelValue': [value: string[]],
}>();

import { ref } from 'vue';

const elInput = ref<HTMLInputElement | null>(null);
const values = ref<string[]>([]);
const newItem = ref('');

function add() {
  if (newItem.value.trim().length > 0) {
    values.value.push(newItem.value.trim());
    newItem.value = '';
    emit('update:modelValue', values.value);
  }
}
function remove(index: number) {
  values.value.splice(index, 1);
  emit('update:modelValue', values.value);
  focusInput();
}
function focusInput() {
  if (elInput.value != null) {
    elInput.value.focus();
  }
}
</script>

<template>
  <div
    class="osim-pill-list form-control"
    @click.prevent="focusInput()"
    @submit.prevent
  >
    <span
      v-for="(value, index) in values"
      :key="index"
      class="osim-pill-list-item badge text-bg-secondary"
    >
      {{ value }}
      <!--<button-->
      <!--    class="bi bi-x-square ms-1"-->
      <!--    @click.prevent="remove(index)"-->
      <!--&gt;-->

      <!--</button>-->
      <i
        class="bi bi-x-square ms-1"
        tabindex="0"
        @keydown.enter.prevent="remove(index)"
        @keydown.space.prevent="remove(index)"
        @click.prevent="remove(index)"
      >
        <span class="visually-hidden">Remove</span>
      </i>
    </span>
    <input
      ref="elInput"
      v-model="newItem"

      class="osim-pill-list-input"

      type="text"
      @submit.prevent
      @blur="add()"

      @keydown.enter.prevent="add()"
    />
    <!--required-->
    <!--pattern="[Cc][Vv][Ee]-\\d+"-->
  </div>

</template>

<style scoped>
.osim-pill-list {
  display: flex;
  flex-flow: row wrap;
  gap: 1em;
  align-items: center;
}
.osim-pill-list:focus-within {
  outline: 0;
  box-shadow:
    var(--bs-focus-ring-x, 0)
    var(--bs-focus-ring-y, 0)
    var(--bs-focus-ring-blur, 0)
    var(--bs-focus-ring-width)
    var(--bs-focus-ring-color);
}

.osim-pill-list-item {
  font-size: .85rem;
}

.osim-pill-list-input {
  display: inline-block;
  border: none;
  outline: none;
  box-shadow: none;
}
.osim-pill-list-input:focus,
.osim-pill-list-input:focus-visible {
  border: none;
  outline: none;
  box-shadow: none;
}
</style>
