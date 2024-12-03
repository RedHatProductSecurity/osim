<script setup lang="ts">
import { computed } from 'vue';

import { navbarBottom, footerTop, footerHeight } from '@/stores/responsive';
import { useSettingsStore } from '@/stores/SettingsStore';
import { useToastStore } from '@/stores/ToastStore';
import Toast from '@/widgets/Toast/Toast.vue';

// const props = defineProps<{
//   // timestamp: moment.Moment,
// }>();

const { toasts } = useToastStore();
const { settings } = useSettingsStore();

const top = computed<string>(() => {
  return navbarBottom.value > 0 ? 'auto' : '0';
});
const position = computed<string>(() => {
  return navbarBottom.value > 0 ? 'absolute' : 'fixed';
});
const height = computed<string>(() => {
  if (navbarBottom.value > 0) {
    return footerTop.value - navbarBottom.value + 'px';
  } else {
    return 'calc(100vh - ' + footerHeight.value + 'px)';
  }
});

function clearAll() {
  toasts.length = 0;
  // while (toasts.length > 0) {
  //   toasts.shift();
  // }
}
</script>

<template>
  <!-- <div
    class="osim-toast-container
    toast-container position-fixed top-0
    bottom-0 end-0 overflow-auto overflow-x-hidden p-3"
  > -->
  <div class="osim-toast-container toast-container p-3">
    <div
      class="toast"
      style="display:block;visibility: hidden;height:0;margin:0;padding:0;border:0;"
    ><!--
      Hack: when removing the last toast, the container width is set to 0,
            which causes the toast to clip or squash when being animated.
            This preserves the container width, which fixes animation.
    --></div>
    <Transition name="toast">
      <div
        v-if="settings.showNotifications && toasts.length > 0"
        class="osim-toast-container-clear justify-content-end"
      >
        <button
          v-if="settings.showNotifications && toasts.length > 0"
          type="button"
          class="btn btn-secondary btn-sm mb-3"
          @click.prevent="clearAll"
        >Clear All<i class="bi bi-trash3 ms-1"></i></button>
      </div>
    </Transition>
    <TransitionGroup name="toast">
      <Toast
        v-for="(toast, index) in toasts"
        v-show="toast.isFresh || settings.showNotifications"
        :key="toast.id"
        :title="toast.title"
        :body="toast.body"
        :bodyHtml="toast.bodyHtml"
        :timestamp="toast.timestamp"
        :timeoutMs="toast.timeoutMs"
        :css="toast.css"
        @close="toasts.splice(index, 1)"
        @stale="toast.isFresh = false"
      >
      </Toast>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.osim-toast-container-clear button {
  pointer-events: auto;
}

.osim-toast-container {
  position: v-bind(position);
  top: v-bind(top);

  /* height: calc(100vh - 100px); */
  height: v-bind(height);
  overflow: clip auto;

  /* clip-path: inset(-100vw 0 -100vw -100vw); */
  left: 0;

  /* justify-self: end; */
}

.osim-toast-container-clear {
  pointer-events: auto;
}

.toast-move,
.toast-enter-active,
.toast-leave-active {
  transition: all 0.2s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

.toast-leave-active {
  position: absolute;
}
</style>
