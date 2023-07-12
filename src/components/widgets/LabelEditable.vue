<script setup lang="ts">

import EditableText from './EditableText.vue';
import EditableDate from './EditableDate.vue';

const props = defineProps<{
  // modelValue: string,
  label: string,
  type: 'text' | 'date',
  // error: string,
}>();

const components = {
  text: EditableText,
  date: EditableDate,
}

// const emit = defineEmits<{
//   'update:modelValue': [value: string],
// }>();

function doupdate() {
  console.log('doupdate', arguments);
}

</script>

<template>
  <label class="osim-input mb-3 border-start ps-3">
    <span class="form-label">
      {{ label }}
      <!--<br />-->
      <!--attrs: {{ $attrs }}-->
      <!--<br/>-->
    </span>
    <!-- https://github.com/vuejs/language-tools/issues/3138 -->
    <component
        :is="components[type as keyof typeof components] as any"
        v-bind="$attrs"
    />
    <!--class="form-control"-->
    <!--v-bind="$attrs"-->
    <!--:value="modelValue"-->
    <!--@update="doupdate"-->
    <span v-if="!(type in components)" class="alert alert-danger d-block" role="alert">OSIM BUG: Incorrect LabelEditable type</span>
<!--<pre>labelEditable value: {{$attrs.modelValue}}</pre>-->
  </label>

</template>

<style scoped>

.osim-input {
  display: block;
}

</style>
