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

export function showSuccessToast(count: number, entityType: string, operation: string) {
  if (count === 0) return;

  const entityWithPlural = count !== 1 ? entityType + 's' : entityType;
  const { addToast } = useToastStore();
  addToast({
    title: 'Success!',
    body: `${count} ${entityWithPlural} ${operation}`,
    css: 'success',
  });
}

export async function executeOperationsInParallel<T>(
  operations: Array<Promise<T>>,
): Promise<{ failed: any[]; hasErrors: boolean; successful: T[] }> {
  const results = await Promise.allSettled(operations);
  const successful: T[] = [];
  const failed: any[] = [];

  for (const result of results) {
    if (result.status === 'fulfilled') {
      successful.push(result.value);
    } else {
      failed.push(result.reason?.data || result.reason);
    }
  }

  return {
    successful,
    failed,
    hasErrors: failed.length > 0,
  };
}
