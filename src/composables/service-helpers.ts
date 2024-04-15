import { getDisplayedOsidbError } from '@/services/OsidbAuthService';
import { useToastStore } from '@/stores/ToastStore';
import { AxiosError, type AxiosResponse } from 'axios';

export function createCatchHandler(title: string = 'Error', callback?: () => void, shouldThrow: boolean = true) {
  return (error: AxiosError) => {
    const displayedError = getDisplayedOsidbError(error);
    const { addToast } = useToastStore();
    addToast({
      title,
      body: displayedError,
      css: 'warning',
    });
    console.error('❌ ', error);

    if (callback) {
      callback();
    }

    if (shouldThrow) {
      throw error;
    }
  };
}

export function createSuccessHandler({
  title = 'Operation Successful',
  body,
}: Record<string, string>) {
  return (response: AxiosResponse | void) => {
    const { addToast } = useToastStore();
    addToast({
      title,
      body,
      css: 'success',
    });
    return response;
  };
}
