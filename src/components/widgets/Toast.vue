<script setup lang="ts">

import {computed, onBeforeUnmount, onMounted, ref, watchEffect} from 'vue';
import { DateTime } from 'luxon';
import ProgressRing from "@/components/widgets/ProgressRing.vue";
import {useSettingsStore} from '@/stores/SettingsStore';

const {settings} = useSettingsStore();

const props = defineProps<{
  title?: string,
  body: string,
  timestamp: DateTime,
  bodyHtml?: boolean,
  timeoutMs?: number,
  css?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark',
}>();

const emit = defineEmits<{
  close: [],
  stale: [],  // Called when the toast is no longer fresh and visibility should be controlled by showNotifications
}>();

const css = computed(() => {
  return props.css ?? 'light';
});

const isStale = ref(false);
const freshMs = 10000;  // ms for inactive toast to remain fresh
const freshMsCss = computed(() => `${freshMs}ms`);

const active = ref<boolean>(false);
const inactiveDate = ref(Date.now());
const percentTimeRemaining = ref<number>(100);

const percentFreshTimeRemaining = ref<number>(100);
let freshAndBecomingStaleStart = ref(true);

let freshCountdownId: number = NaN;  // Use NaN to check if the id has been assigned before clearInterval
onMounted(() => {
  freshCountdownId = setInterval(() => {
    if (settings.showNotifications) {
      percentFreshTimeRemaining.value = 0;
      emit('stale');
      isStale.value = true;
      clearInterval(freshCountdownId);
      return;
    }
    if (active.value) {
      percentFreshTimeRemaining.value = 100;
      return;
    }
    // inactive
    freshAndBecomingStaleStart.value = percentFreshTimeRemaining.value === 100;
    let msNotHovered = Date.now() - inactiveDate.value;
    percentFreshTimeRemaining.value = 100 - 100 * msNotHovered / freshMs;
    if (percentFreshTimeRemaining.value <= 0) {
      clearInterval(freshCountdownId);
      emit('stale');
      isStale.value = true;
    }
  }, 33); // 1000ms / 30fps = 33ms
});
onBeforeUnmount(() => {
  if (!Number.isNaN(freshCountdownId)) {
    clearInterval(freshCountdownId);
  }
})

if (props.timeoutMs) {
  let countdownId: number = NaN;
  onMounted(() => {
    const countdownId: number = setInterval(() => {
      if (active.value || props.timeoutMs == null) {
        percentTimeRemaining.value = 100;
        return;
      }
      let msNotHovered = Date.now() - inactiveDate.value;
      percentTimeRemaining.value = 100 - 100 * msNotHovered / props.timeoutMs;
      if (percentTimeRemaining.value <= 0) {
        clearInterval(countdownId);
        emit('close');
      }
    }, 33); // 1000ms / 30fps = 33ms
  });
  onBeforeUnmount(() => {
    if (!Number.isNaN(freshCountdownId)) {
      clearInterval(countdownId);
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

const toastClasses = computed(() => {
  const classes: { [key: string]: boolean } = {};

  const textBgKey: string = 'text-bg-' + css.value;
  classes[textBgKey] = true;

  let freshAndBecomingStale = !settings.showNotifications && !active.value && !isStale.value;
  classes['fresh-leave-active'] = freshAndBecomingStale;

  return classes;
});

const timeoutRingDiameter = ref(22);
const timeoutRingDiameterPx = computed(() => timeoutRingDiameter.value + 'px');

</script>

<template>
  <div
      class="osim-toast toast show"
      :class="toastClasses"
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
        <strong class="me-auto">{{ title ?? '' }}</strong>
        <small class="text-muted">{{ timestampRelative }}</small>
        <button
            type="button"
            class="osim-toast-close-btn btn-close"
            aria-label="Close"
            @click="$emit('close')">
          <ProgressRing
              class="osim-temporary-toast-timer"
              v-if="timeoutMs"
              color="grey"
              :progress="percentTimeRemaining"
              :diameter="timeoutRingDiameter"
              :stroke="2"
              :transition-duration-ms="transitionDurationMs"
              direction="down"
          />
        </button>
      </slot>
    </div>
    <div class="toast-body osim-toast-body">
      <slot name="body">
        <div v-if="bodyHtml" v-html="body"></div>
        <div v-if="!bodyHtml">
          {{ body }}
        </div>
      </slot>
    </div>
  </div>
</template>

<style scoped>
.osim-toast {
  min-width: var(--bs-toast-max-width);
  transition: transform ease-in;
}
.osim-toast-body {
  white-space: pre-wrap;
}
.osim-toast-timer {
  margin-right: 5px;
}

button.osim-toast-close-btn {
  overflow: visible;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}
.osim-temporary-toast-timer {
  position: absolute;
  width: v-bind(timeoutRingDiameterPx);
  height: v-bind(timeoutRingDiameterPx);
}
.fresh-leave-active {
  animation-duration: v-bind(freshMsCss);
  animation-name: slideout;
  transition: transform ease-in;
}
@keyframes slideout {
  from {
    transform: none;
  }
  to {
    transform: translateX(20px);
  }
}

</style>
