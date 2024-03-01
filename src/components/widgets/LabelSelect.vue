<script setup lang="ts">
withDefaults(
  defineProps<{
    modelValue: string | null;
    options: string[];
    label: string;
  }>(),
  {
    modelValue: '',
  },
);
</script>

<template>
  <label class="osim-input mb-3 ps-3">
    <div class="row">
      <span v-if="label" class="form-label col-3">
        {{ label }}
      </span>
      <div class="col-9">
        <select
          :value="modelValue"
          v-bind="{
            ...$attrs,
            // onChange: $event => {
            //   $emit('update:modelValue', ($event as InputEvent).target.value)
            // },
          }"
          class="form-select"
          @change="
            $emit('update:modelValue', (($event as InputEvent).target as HTMLInputElement).value)
          "
        >
          <option
            v-for="option in options"
            :key="option"
            :value="option"
            :selected="option === modelValue"
          >
            {{ option }}
          </option>
        </select>
      </div>
      <!--<pre>select value: {{modelValue}}</pre>-->
    </div>
  </label>
</template>

<style scoped>
.osim-input {
  display: block;
}
</style>
