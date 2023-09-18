import {ref} from 'vue';
import {defineStore} from 'pinia';
import moment from 'moment';

interface ToastNew {
  title?: string,
  body: string,
  // timestamp: moment.Moment,
  // key?: number,
  timeoutMs?: number,
  css?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark',
}

interface ToastAdded extends ToastNew {
  id: number,
  timestamp: moment.Moment,
}

let toastId = 0;

export const useToastStore = defineStore('ToastStore', () => {
  const toasts = ref<ToastAdded[]>([]);

  function addToast(toast: ToastNew) {
    const newToast: ToastAdded = {...toast, id: toastId++, timestamp: moment()};
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

