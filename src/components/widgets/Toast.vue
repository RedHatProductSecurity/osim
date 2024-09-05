<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watchEffect } from 'vue';

import { DateTime } from 'luxon';

import ProgressRing from '@/components/widgets/ProgressRing.vue';

import { useSettingsStore } from '@/stores/SettingsStore';

const props = withDefaults(defineProps<ToastProps>(), {
  css: 'light',
  title: '',
  timeoutMs: undefined,
});

const emit = defineEmits<{
  close: [];
  // Called when the toast is no longer fresh and
  // visibility should be controlled by showNotifications
  stale: [];
}>();

const { settings } = useSettingsStore();

export interface ToastProps {
  body: string;
  bodyHtml?: boolean;
  css?: 'danger' | 'dark' | 'info' | 'light' | 'primary' | 'secondary' | 'success' | 'warning';
  timeoutMs?: number;
  timestamp: DateTime;
  title?: string;
}

const cssMapping: Record<NonNullable<ToastProps['css']>, string> = {
  primary: 'text-bg-primary',
  secondary: 'text-bg-secondary',
  success: 'text-bg-success',
  danger: 'text-bg-danger',
  warning: 'text-bg-warning',
  info: 'text-bg-info',
  light: 'text-bg-light',
  dark: 'text-bg-dark',
};

const css = computed(() => cssMapping[props.css]);

const isStale = ref(false);
const freshMs = 10000;  // ms for inactive toast to remain fresh
const freshMsCss = computed(() => `${freshMs}ms`);

const active = ref<boolean>(false);
const inactiveDate = ref(Date.now());
const percentTimeRemaining = ref<number>(100);

const percentFreshTimeRemaining = ref<number>(100);
const freshAndBecomingStaleStart = ref(true);

// Use NaN to check if the id has been assigned before clearInterval
let freshCountdownId: number = Number.NaN;
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
    const msNotHovered = Date.now() - inactiveDate.value;
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
});

if (props.timeoutMs) {
  const countdownId: number = Number.NaN;
  onMounted(() => {
    const countdownId: number = setInterval(() => {
      if (active.value || props.timeoutMs == null) {
        percentTimeRemaining.value = 100;
        return;
      }
      const msNotHovered = Date.now() - inactiveDate.value;
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
};

const updateTimestampSecond = (updatesRemaining: number = 60) => {
  updateTimestamp();
  if (updatesRemaining > 0) {
    setTimeout(updateTimestampSecond.bind(null, updatesRemaining - 1), 1000);
  } else {
    updateTimestampMinute();
  }
};

let relativeTimeInterval: number;
const updateTimestampMinute = (updatesRemaining: number = 60) => {
  updateTimestamp();
  if (updatesRemaining > 0) {
    setTimeout(updateTimestampMinute.bind(null, updatesRemaining - 1), 60000);
  } else {
    relativeTimeInterval = setInterval(updateTimestamp, 60000 * 5); // 5 minutes
  }
};
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

  classes[css.value] = true;

  const freshAndBecomingStale = !settings.showNotifications && !active.value && !isStale.value;
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
          @click="$emit('close')"
        >
          <ProgressRing
            v-if="timeoutMs"
            class="osim-temporary-toast-timer"
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
        <!-- eslint-disable-next-line vue/no-v-html -->
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
  transition: transform;
  animation-timing-function: ease-in;
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
