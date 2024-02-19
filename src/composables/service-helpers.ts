import { getDisplayedOsidbError } from '@/services/OsidbAuthService';
import { useToastStore } from '@/stores/ToastStore';
import { AxiosError, type AxiosResponse } from 'axios';

export function createCatchHandler(title: string = 'Error', shouldThrow: boolean = true) {
  return (error: AxiosError) => {
    const displayedError = getDisplayedOsidbError(error);
    const { addToast } = useToastStore();
    addToast({
      title,
      body: displayedError,
      css: 'warning',
    });
    console.error('❌ ', error);
    if (shouldThrow) {
      throw error;
    }
  };
}

export function createSuccessHandler({ title, body }: Record<string, string>) {
  return (response: AxiosResponse) => {
    const { addToast } = useToastStore();
    addToast({
      title,
      body,
      css: 'success',
    });
    return response;
  };
}

