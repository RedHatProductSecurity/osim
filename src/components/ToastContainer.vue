<script setup lang="ts">
import Toast from '../components/widgets/Toast.vue';
import {useToastStore} from '../stores/ToastStore';
import {computed, ref} from "vue";
import {navbarBottom, footerTop, footerHeight} from "@/stores/responsive";

// const props = defineProps<{
//   // timestamp: moment.Moment,
// }>();

const {toasts, $reset} = useToastStore();

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
  console.log('clearing all');
  toasts.length = 0;
  // while (toasts.length > 0) {
  //   toasts.shift();
  // }
}

</script>

<template>
  <!--  <div class="osim-toast-container toast-container position-fixed top-0 bottom-0 end-0 overflow-auto overflow-x-hidden p-3">-->
  <div class="osim-toast-container toast-container p-3">
    <div class="toast" style="display:block;visibility: hidden;height:0;margin:0;padding:0;border:0;"><!--
      Hack: when removing the last toast, the container width is set to 0,
            which causes the toast to clip or squash when being animated.
            This preserves the container width, which fixes animation.
    --></div>
    <Transition name="toast">
      <div class="osim-toast-container-clear">
        <button
            v-if="toasts.length > 1"
            type="button"
            class="btn btn-secondary btn-sm mb-3"
            @click.prevent="clearAll"
        >Clear All</button>
      </div>
    </Transition>
    <TransitionGroup name="toast">
      <Toast
        v-for="(toast, index) in toasts"
        :key="toast.id"
        :title="toast.title"
        :body="toast.body"
        :bodyHtml="toast.bodyHtml"
        :timestamp="toast.timestamp"
        :timeoutMs="toast.timeoutMs"
        :css="toast.css"
        @close="toasts.splice(index, 1)"
      >
      </Toast>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.osim-toast-container {
  position: v-bind(position);
  top: v-bind(top);
  /*height: calc(100vh - 100px);*/
  height: v-bind(height);
  overflow-x: clip;
  overflow-y: auto;
  /*clip-path: inset(-100vw 0 -100vw -100vw);*/
  right: 0;
  /*justify-self: end;*/
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
