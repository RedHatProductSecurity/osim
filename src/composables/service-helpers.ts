import { getDisplayedOsidbError, parseOsidbErrors } from '@/services/osidb-errors-helpers';
import { useToastStore } from '@/stores/ToastStore';

export function createCatchHandler(title: string = 'Error', shouldThrow: boolean = true) {
  return (error: any) => {
    const displayedError = Array.isArray(error)
      ? parseOsidbErrors(error)
      : getDisplayedOsidbError(error);
    const { addToast } = useToastStore();
    addToast({
      title,
      body: displayedError,
      css: 'warning',
    });
    console.error('service-helpers::createCatchHandler() ' + title, error);

    if (shouldThrow) {
      throw error;
    }
  };
}

export function createSuccessHandler<T>({
  body,
  title = 'Operation Successful',
}: Record<string, string>) {
  return (response: T) => {
    const { addToast } = useToastStore();
    addToast({
      title,
      body,
      css: 'success',
    });
    return response;
  };
}
