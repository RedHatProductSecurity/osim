<script setup lang="ts">
import { isStringArray } from '@/utils/guards';

withDefaults(
  defineProps<{
    disabled?: boolean;
    error: null | string;
    label: string;
    modelValue?: null | string;
    options: Record<string, string> | string[];
    optionsHidden?: null | string[];
    withBlank?: boolean;
  }>(),
  {
    modelValue: '',
    optionsHidden: null,
    disabled: false,
  },
);
defineEmits<{
  'update:modelValue': [value: string | undefined];
}>();

defineOptions({
  inheritAttrs: false,
});
</script>

<template>
  <label class="osim-input mb-2 ps-3">
    <div class="row">
      <span class="form-label col-3">
        <slot name="label" :label>
          {{ label }}
        </slot>
      </span>
      <div class="col-9">
        <select
          :value="modelValue"
          :disabled="disabled"
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
          <option
            v-if="withBlank && modelValue !== ''"
            selected
            disabled
            value=""
          ></option>
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
