<script setup lang="ts">

import {computed, onBeforeUnmount, ref, toRef, toRefs, watch, watchEffect} from 'vue';
import { DateTime } from 'luxon';
import ProgressRing from "@/components/widgets/ProgressRing.vue";

const props = defineProps<{
  title?: string,
  body: string,
  timestamp: DateTime,
  timeoutMs?: number,
  css?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark',
}>();

const emit = defineEmits<{
  close: [],
}>();

const css = computed(() => {
  return props.css ?? 'light';
});

const active = ref<boolean>(false);
const inactiveDate = ref(Date.now());
const percentTimeRemaining = ref<number>(100);

if (props.timeoutMs) {
  const countdown: number = setInterval(() => {
    if (active.value || props.timeoutMs == null) {
      percentTimeRemaining.value = 100;
      return;
    }
    percentTimeRemaining.value = 100 - 100 * (Date.now() - inactiveDate.value) / props.timeoutMs;
  }, 33); // 1000ms / 30fps = 33ms
  onBeforeUnmount(() => {
    clearInterval(countdown);
  });
  watch(percentTimeRemaining, () => {
    if (percentTimeRemaining.value <= 0) {
      emit('close');
    }
  });
}

// Initialize ref
const timestampRelative = ref<string>(props.timestamp.toRelative() || '');

// Update function
const updateTimestamp = () => {
  timestampRelative.value = props.timestamp.toRelative() || '';
}

const updateTimestampSecond = (updatesRemaining: number = 60) => {
  updateTimestamp();
  if (updatesRemaining > 0) {
    setTimeout(updateTimestampSecond.bind(null, updatesRemaining - 1), 1000);
  } else {
    updateTimestampMinute();
  }
}

let relativeTimeInterval: number;
const updateTimestampMinute = (updatesRemaining: number = 60) => {
  updateTimestamp();
  if (updatesRemaining > 0) {
    setTimeout(updateTimestampMinute.bind(null, updatesRemaining - 1), 60000);
  } else {
    relativeTimeInterval = setInterval(updateTimestamp, 60000 * 5); // 5 minutes
  }
}
updateTimestampSecond();

onBeforeUnmount(() => {
  clearInterval(relativeTimeInterval);
});

watchEffect(() => {
  updateTimestamp();
});

const transitionDurationMs = ref(16);

</script>

<template>
  <div
      class="osim-toast toast show"
      :class="['text-bg-' + css]"
      role="alert"
      aria-labelledby="modalTitle"
      aria-live="assertive"
      aria-atomic="true"
      @mouseover="active = true; transitionDurationMs = 0"
      @mouseleave="inactiveDate = Date.now(); transitionDurationMs = 16; active = false"
  >
    <!--:style="{display: show? 'block' : 'none'}"-->
    <div class="toast-header">
      <slot name="header">
        <ProgressRing
            class="osim-toast-timer"
            v-if="timeoutMs"
            color="grey"
            :progress="percentTimeRemaining"
            :diameter="12"
            :stroke="6"
            :transition-duration-ms="transitionDurationMs"
            direction="down"
        />
        <strong class="me-auto">{{ title ?? '' }}</strong>
        <small class="text-muted">{{ timestampRelative }}</small>
        <button type="button" class="btn-close" aria-label="Close" @click="$emit('close')"></button>
      </slot>
    </div>
    <div class="toast-body osim-toast-body">
      <slot name="body">
        {{ body }}
      </slot>
    </div>
  </div>
</template>

<style scoped>
.osim-toast {
  min-width: var(--bs-toast-max-width);
}
.osim-toast-body {
  white-space: pre-wrap;
}
.osim-toast-timer {
  margin-right: 5px;
}
/*
.osim-body-html {
  all: initial;
}
*/
</style>
