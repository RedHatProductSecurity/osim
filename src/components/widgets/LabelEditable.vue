<script setup lang="ts">

import EditableText from './EditableText.vue';
import EditableDate from './EditableDate.vue';

const props = withDefaults(defineProps<{
  // modelValue: string,
  label?: string,
  type: 'text' | 'date',
  // error: string,
  // required: boolean,
}>(), {
  label: '',
  // required: false,
});

const components = {
  text: EditableText,
  date: EditableDate,
};
const modelValue = defineModel<string | undefined | null | number>();
</script>

<template>
  <label class="osim-input ps-3 mb-3 input-group">
    <div class="row">
      <span class="form-label col-3">
        <slot name="label">
          {{ label }}
        </slot>
    
        <!--<br />-->
        <!--<br/>-->
      </span>
      <!-- https://github.com/vuejs/language-tools/issues/3138 -->
      <component
        :is="components[type as keyof typeof components] as any"
        v-model="modelValue"
        v-bind="$attrs"
      />
      <!--class="form-control"-->
      <!--v-bind="$attrs"-->
      <!--:value="modelValue"-->
      <!--@update="doupdate"-->
      <span v-if="!(type in components)" class="alert alert-danger d-block" role="alert">OSIM BUG: Incorrect LabelEditable type</span>
    <!--<pre>labelEditable value: {{$attrs.modelValue}}</pre>-->
    </div>
  </label>

</template>

<style scoped>

.osim-input {
  display: block;
}

</style>
