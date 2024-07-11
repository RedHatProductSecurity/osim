<script setup lang="ts">
import { isStringArray } from '@/utils/guards';

defineEmits<{
  'update:modelValue': [value: string | undefined],
}>();
withDefaults(
  defineProps<{
    modelValue: string | null;
    options: string[] | Record<string, string>;
    optionsHidden?: string[] | null;
    label: string;
    error: string | null;
  }>(),
  {
    modelValue: '',
    optionsHidden: null
  },
);
</script>

<template>
  <label class="osim-input mb-2 ps-3">
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
          :class="{'is-invalid': error != null}"
          @change="
            $emit('update:modelValue', (($event as InputEvent).target as HTMLInputElement).value)
          "
        >
          <template v-if="isStringArray(options)">
            <option
              v-for="option in options"
              :key="option"
              :value="option"
              :selected="option === modelValue"
              :hidden="optionsHidden?.includes(option)"
            >
              {{ option }}
            </option>
          </template>
          <template v-else>
            <option
              v-for="(value, key) in options"
              :key="key"
              :value="value"
              :selected="value === modelValue"
              :hidden="optionsHidden?.includes(value)"
            >
              {{ key }}
            </option>
          </template>
        </select>
        <div
          v-if="error"
          class="invalid-tooltip"
        >{{ error }}</div>
      </div>
    </div>
  </label>
</template>

<style lang="scss" scoped>
.osim-input {
  display: block;
  position: relative;

  .invalid-tooltip {
    display: none;
  }

  &:hover .invalid-tooltip {
    display: block;
  }
}
</style>
