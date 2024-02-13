import { getDisplayedOsidbError } from '@/services/OsidbAuthService';
import { useToastStore } from '@/stores/ToastStore';
import { AxiosError, type AxiosResponse } from 'axios';

export function createCatchHandler(title: string = 'Error', shouldThrow: boolean = true) {
  return (error: AxiosError) => {
    const displayedError = getDisplayedOsidbError(error);
    const { addToast } = useToastStore();
    addToast({
      title,
      body: `${displayedError}: ${error.response?.data}`,
      css: 'warning',
    });
    console.error('❌ ', error);
    if (shouldThrow) throw error;
    return error;
  };
}

export function createSuccessHandler({ title, body }: Record<string, string>, onSucceed: Function = () => {}) {
  return (response: AxiosResponse) => {
    const { addToast } = useToastStore();
    onSucceed(response);
    addToast({
      title,
      body,
      css: 'success',
    });
  };
}
