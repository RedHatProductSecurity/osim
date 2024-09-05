import { ref } from 'vue';

import { defineStore } from 'pinia';
import { DateTime } from 'luxon';

import type { ToastProps } from '@/components/widgets/Toast.vue';

export interface ToastNew {
  body: string;
  bodyHtml?: boolean;
  css?: ToastProps['css'];
  timeoutMs?: number;
  title?: string;
}

interface ToastAdded extends ToastNew {
  id: number;
  isFresh: boolean;
  timestamp: DateTime;
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
