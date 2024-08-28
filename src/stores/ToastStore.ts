import { ref } from 'vue';
import { defineStore } from 'pinia';
import { DateTime } from 'luxon';
import type { ToastProps } from '@/components/widgets/Toast.vue';


export interface ToastNew {
  title?: string,
  body: string,
  bodyHtml?: boolean,
  timeoutMs?: number,
  css?: ToastProps['css'],
}

interface ToastAdded extends ToastNew {
  id: number,
  timestamp: DateTime,
  isFresh: boolean,
}

let toastId = 0;

export const useToastStore = defineStore('ToastStore', () => {
  const toasts = ref<ToastAdded[]>([]);

  function addToast(toast: ToastNew) {
    const newToast: ToastAdded = {
      ...toast,
      id: toastId++,
      timestamp: DateTime.now(),
      isFresh: true,
    };
    toasts.value.unshift(newToast);
  }

  function $reset() {
    toasts.value = [];
  }

  return {
    $reset,
    addToast,
    toasts,
  };
});

