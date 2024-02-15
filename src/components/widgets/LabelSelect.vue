<script setup lang="ts">

const props = withDefaults(defineProps<{
  modelValue: string,
  options: string[],
  label: string,
}>(), {
  modelValue: '',
});

</script>

<template>
  <label class="osim-input mb-3 border-start ps-3">
    <span
        class="form-label"
        v-if="label"
    >
      {{ label }}
      <!--attrs: {{ $attrs }}-->
    </span>


    <select
        class="form-select"
        :value="modelValue"
        v-bind="{
          ...$attrs,
          // onChange: $event => {
          //   $emit('update:modelValue', ($event as InputEvent).target.value)
          // },
        }"
        @change="$emit('update:modelValue', (($event as InputEvent).target as HTMLInputElement).value)"
    >
      <option
          v-for="option in options"
          :value="option"
          :key="option"
          :selected="option === modelValue"
      >{{ option }}</option>

    </select>
<!--<pre>select value: {{modelValue}}</pre>-->
  </label>

</template>

<style scoped>

.osim-input {
  display: block;
}

</style>
