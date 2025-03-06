<script setup lang="ts">
import { ref } from 'vue';

import { formatFactor, weights } from '@/composables/useCvss3Calculator';

import { CvssVersions } from '@/constants';

const props = defineProps<{
  cvss3Factors: Record<string, string>;
  cvss4Vector: null | string;
  cvssScore: null | number;
  error: null | string;
  highlightedFactor: null | string;
  isFocused: boolean;
  selectedVersion: CvssVersions;
}>();

const emit = defineEmits<{
  highlightFactor: [factor: null | string];
  onInputBlur: [event: FocusEvent];
  onInputFocus: [event: FocusEvent];
}>();

const input = ref();

defineExpose({
  input,
});

const getFactorColor = (weight: number, isHovered: boolean = false) => {
  const hue = isHovered ? 200 : (1 - weight) * 80; // red being 0, 80 being green
  const alpha = props.highlightedFactor === null
    ? 1
    : isHovered
      ? 1
      : 0.75;
  const hslForText = `hsla(${hue}, 100%, 35%, ${alpha})`;
  const hslForBackground = `hsla(${hue}, 100%, 95%, ${alpha})`;
  return {
    'color': hslForText,
    'background-color': hslForBackground,
  };
};
</script>

<template>
  <div
    ref="input"
    tabindex="0"
    :class="{
      'is-invalid': error != null,
      'dark-background': isFocused,
      'text-cursor': isFocused,
    }"
    class="vector-input form-control"
    @focus="emit('onInputFocus', $event);"
    @blur="emit('onInputBlur', $event)"
  >
    <span
      class="osim-cvss-score"
      :style="isFocused ? {color: 'white'} : {color: 'black'}"
    >
      {{ cvssScore !== null ? `${cvssScore} ` : '' }}
    </span>
    <template v-for="(value, key) in cvss3Factors" :key="key">
      <span
        v-if="value && selectedVersion === CvssVersions.V3"
        :style="isFocused && key.toString() !== 'CVSS'
          ? getFactorColor(weights[key][value], key === highlightedFactor)
          : (isFocused ? {color: 'white'} : {color: 'black'})"
        @mouseover="emit('highlightFactor',key)"
        @mouseleave="emit('highlightFactor',null)"
      >
        {{ formatFactor(key.toString(), value) }}
      </span>
    </template>
    <template v-if="selectedVersion === CvssVersions.V4">
      <span
        :style="isFocused ? {color: 'white'} : {color: 'black'}"
      >
        {{ cvss4Vector }}
      </span>
    </template>
    <div v-if="error" class="invalid-tooltip">
      {{ error }}
    </div>
  </div>
</template>

<style scoped lang="scss">
.osim-cvss-score {
  font-weight: 600;
}

.vector-input {
  min-height: 38px;

  .invalid-tooltip {
    display: none;
    margin-top: -4px;
    margin-left: -8px;
  }

  &:hover .invalid-tooltip {
    display: flex;
  }
}

.text-cursor {
  cursor: text !important;
}

.dark-background {
  background-color: #525252 !important;
}
</style>
