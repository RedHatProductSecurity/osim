<script setup lang="ts">

withDefaults( defineProps<{
  modelValue: string | null,
  options: string[] ,
  label: string,
}>(), {
  modelValue: '',
});

</script>
    
<template>
  <label class="osim-input mb-3 border-start ps-3">
    <span v-if="label" class="form-label">
      {{ label }}
    </span>
    <select
      :value="modelValue"
      v-bind="{
        ...$attrs,
        // onChange: $event => {
        //   $emit('update:modelValue', ($event as InputEvent).target.value)
        // },
      }"
      class="form-select"
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
  display: block ; 
}

</style>
