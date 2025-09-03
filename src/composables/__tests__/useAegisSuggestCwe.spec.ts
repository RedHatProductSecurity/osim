import { ref } from 'vue';

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { useAegisSuggestCwe } from '@/composables/aegis/useAegisSuggestCwe';
import {
  serializeAegisContext,
  type AegisSuggestionContextRefs,
} from '@/composables/aegis/useAegisSuggestionContext';

import { withSetup } from '@/__tests__/helpers';

const mockAddToast = vi.fn();
vi.mock('@/stores/ToastStore', () => ({
  useToastStore: vi.fn(() => ({
    addToast: mockAddToast,
  })),
}));

const analyzeMock = vi.fn();
vi.mock('@/services/AegisAIService', () => ({
  AegisAIService: vi.fn().mockImplementation(() => ({
    analyzeCVEWithContext: analyzeMock,
  })),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

function createContext(overrides?: Partial<Parameters<typeof serializeAegisContext>[0]>) {
  const ctx = {
    cveId: ref<null | string>('CVE-2024-1234'),
    title: ref<null | string>('Sample Title'),
    commentZero: ref<null | string>(null),
    cveDescription: ref<null | string>(null),
    requiresCveDescription: ref<null | string>(null),
    statement: ref<null | string>(null),
    components: ref<null | string[]>(['kernel']),
    ...overrides,
  } as AegisSuggestionContextRefs;
  return ctx;
}

describe('useAegisSuggestCwe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not suggest when CVE ID is invalid and shows a toast', async () => {
    const toastStore = (await import('@/stores/ToastStore')).useToastStore();
    const addToast = vi.mocked(toastStore.addToast);
    const valueRef = ref<null | string>(null);
    const context = createContext({ cveId: ref('INVALID') });

    const [composable] = withSetup(
      () => useAegisSuggestCwe({ context: context as AegisSuggestionContextRefs, valueRef }), [],
    );

    expect(composable.canSuggest.value).toBe(false);
    await composable.suggestCwe();

    expect(analyzeMock).not.toHaveBeenCalled();
    expect(addToast).toHaveBeenCalledWith({ title: 'AI Suggestion', body: 'Valid CVE ID required for suggestions.' });
    expect(composable.isSuggesting.value).toBe(false);
  });

  it('calls service with expected payload when suggesting', async () => {
    const valueRef = ref<null | string>('CWE-79');
    const context = createContext({ cveId: ref('CVE-2024-1234'), title: ref('Some Title') });

    analyzeMock.mockResolvedValueOnce({ cwe: ['CWE-89'], confidence: 0.9, explanation: 'Reasoning' });

    const [composable] = withSetup(
      () => useAegisSuggestCwe({ context: context as AegisSuggestionContextRefs, valueRef }), [],
    );

    expect(composable.canSuggest.value).toBe(true);
    await composable.suggestCwe();

    expect(analyzeMock).toHaveBeenCalledTimes(1);
    expect(analyzeMock).toHaveBeenCalledWith(expect.objectContaining({
      feature: 'suggest-cwe',
      ...serializeAegisContext(context as AegisSuggestionContextRefs),
    }));
  });

  it('applies suggestion and updates value, details, and flags', async () => {
    const toastStore = (await import('@/stores/ToastStore')).useToastStore();
    const addToast = vi.mocked(toastStore.addToast);
    const valueRef = ref<null | string>('CWE-79');
    const context = createContext({ cveId: ref('CVE-2024-1234'), title: ref('Some Title') });

    analyzeMock.mockResolvedValueOnce({ cwe: ['CWE-89'], confidence: 0.9, explanation: 'Reasoning' });

    const [composable] = withSetup(
      () => useAegisSuggestCwe({ context: context as AegisSuggestionContextRefs, valueRef }), [],
    );

    await composable.suggestCwe();

    expect(valueRef.value).toBe('CWE-89');
    expect(composable.details.value).toEqual({ cwe: 'CWE-89', confidence: 0.9, explanation: 'Reasoning' });
    expect(composable.hasAppliedSuggestion.value).toBe(true);
    expect(composable.canShowFeedback.value).toBe(true);
    expect(addToast).toHaveBeenCalledWith({
      title: 'AI Suggestion Applied',
      body: 'Suggestion applied. Always review AI generated responses prior to use.',
      css: 'info',
      timeoutMs: 8000,
    });
  });

  it('revert restores previous value and clears details and flags', async () => {
    const valueRef = ref<null | string>('CWE-79');
    const context = createContext({ cveId: ref('CVE-2024-1234'), title: ref('Some Title') });

    analyzeMock.mockResolvedValueOnce({ cwe: ['CWE-89'], confidence: 0.9, explanation: 'Reasoning' });

    const [composable] = withSetup(
      () => useAegisSuggestCwe({ context: context as AegisSuggestionContextRefs, valueRef }), [],
    );

    await composable.suggestCwe();
    composable.revert();

    expect(valueRef.value).toBe('CWE-79');
    expect(composable.hasAppliedSuggestion.value).toBe(false);
    expect(composable.details.value).toBeNull();
  });

  it('handles no-suggestion response', async () => {
    const toastStore = (await import('@/stores/ToastStore')).useToastStore();
    const addToast = vi.mocked(toastStore.addToast);
    const valueRef = ref<null | string>('CWE-79');
    const context = createContext();

    analyzeMock.mockResolvedValueOnce({ cwe: [] });

    const [composable] = withSetup(
      () => useAegisSuggestCwe({ context: context as AegisSuggestionContextRefs, valueRef }), [],
    );
    await composable.suggestCwe();

    expect(valueRef.value).toBe('CWE-79');
    expect(composable.hasAppliedSuggestion.value).toBe(false);
    expect(addToast).toHaveBeenCalledWith({ title: 'AI Suggestion', body: 'No valid suggestion received.' });
  });

  it('handles service errors and shows toast', async () => {
    const toastStore = (await import('@/stores/ToastStore')).useToastStore();
    const addToast = vi.mocked(toastStore.addToast);
    const valueRef = ref<null | string>(null);
    const context = createContext();

    analyzeMock.mockRejectedValueOnce({ data: { detail: 'Backend error' } });

    const [composable] = withSetup(
      () => useAegisSuggestCwe({ context: context as AegisSuggestionContextRefs, valueRef }), [],
    );
    await composable.suggestCwe();

    expect(addToast).toHaveBeenCalledWith({ title: 'AI Suggestion Error', body: 'Backend error' });
    expect(composable.isSuggesting.value).toBe(false);
  });
});
