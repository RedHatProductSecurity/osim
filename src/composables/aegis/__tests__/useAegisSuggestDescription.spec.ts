import { ref } from 'vue';

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { useAegisSuggestDescription } from '@/composables/aegis/useAegisSuggestDescription';
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

describe('useAegisSuggestDescription', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not suggest when CVE ID is invalid and shows a toast', async () => {
    const toastStore = (await import('@/stores/ToastStore')).useToastStore();
    const addToast = vi.mocked(toastStore.addToast);
    const titleRef = ref<null | string | undefined>('Original Title');
    const descriptionRef = ref<null | string | undefined>('Original Description');
    const context = createContext({ cveId: ref('INVALID') });

    const [composable] = withSetup(
      () => useAegisSuggestDescription({
        context: context as AegisSuggestionContextRefs,
        titleRef,
        descriptionRef,
      }), [],
    );

    expect(composable.canSuggest.value).toBe(false);
    await composable.suggestDescription();

    expect(analyzeMock).not.toHaveBeenCalled();
    expect(addToast).toHaveBeenCalledWith({
      title: 'AI Suggestion',
      body: 'Valid CVE ID required for suggestions.',
    });
    expect(composable.isSuggesting.value).toBe(false);
  });

  it('calls service with expected payload when suggesting', async () => {
    const titleRef = ref<null | string | undefined>('Original Title');
    const descriptionRef = ref<null | string | undefined>('Original Description');
    const context = createContext({ cveId: ref('CVE-2024-1234'), title: ref('Some Title') });

    analyzeMock.mockResolvedValueOnce({
      suggested_title: 'New Title',
      suggested_description: 'New Description',
      confidence: 0.92,
      explanation: 'Analysis reasoning',
      tools_used: ['description_tool'],
    });

    const [composable] = withSetup(
      () => useAegisSuggestDescription({
        context: context as AegisSuggestionContextRefs,
        titleRef,
        descriptionRef,
      }), [],
    );

    expect(composable.canSuggest.value).toBe(true);
    await composable.suggestDescription();

    expect(analyzeMock).toHaveBeenCalledTimes(1);
    expect(analyzeMock).toHaveBeenCalledWith(expect.objectContaining({
      feature: 'suggest-description',
      ...serializeAegisContext(context as AegisSuggestionContextRefs),
    }));
  });

  it('applies title and description suggestions correctly', async () => {
    const toastStore = (await import('@/stores/ToastStore')).useToastStore();
    const addToast = vi.mocked(toastStore.addToast);
    const titleRef = ref<null | string | undefined>('Original Title');
    const descriptionRef = ref<null | string | undefined>('Original Description');
    const context = createContext({ cveId: ref('CVE-2024-1234'), title: ref('Some Title') });

    analyzeMock.mockResolvedValueOnce({
      suggested_title: 'New Suggested Title',
      suggested_description: 'New Suggested Description',
      confidence: 0.95,
      explanation: 'Analysis reasoning',
      tools_used: ['ai_tool'],
    });

    const [composable] = withSetup(
      () => useAegisSuggestDescription({
        context: context as AegisSuggestionContextRefs,
        titleRef,
        descriptionRef,
      }), [],
    );

    await composable.suggestDescription();

    expect(titleRef.value).toBe('New Suggested Title');
    expect(descriptionRef.value).toBe('New Suggested Description');
    expect(composable.hasAppliedTitleSuggestion.value).toBe(true);
    expect(composable.hasAppliedDescriptionSuggestion.value).toBe(true);
    expect(composable.details.value).toMatchObject({
      suggested_title: 'New Suggested Title',
      suggested_description: 'New Suggested Description',
      confidence: 0.95,
    });
    expect(addToast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'AI Suggestion Applied',
      css: 'info',
    }));
  });

  it('handles missing title in response', async () => {
    const titleRef = ref<null | string | undefined>('Original Title');
    const descriptionRef = ref<null | string | undefined>('Original Description');
    const context = createContext({ cveId: ref('CVE-2024-1234') });

    analyzeMock.mockResolvedValueOnce({
      suggested_description: 'New Description Only',
      confidence: 0.88,
    });

    const [composable] = withSetup(
      () => useAegisSuggestDescription({
        context: context as AegisSuggestionContextRefs,
        titleRef,
        descriptionRef,
      }), [],
    );

    await composable.suggestDescription();

    expect(titleRef.value).toBe('Original Title');
    expect(descriptionRef.value).toBe('New Description Only');
    expect(composable.hasAppliedDescriptionSuggestion.value).toBe(true);
  });

  it('handles missing description in response', async () => {
    const titleRef = ref<null | string | undefined>('Original Title');
    const descriptionRef = ref<null | string | undefined>('Original Description');
    const context = createContext({ cveId: ref('CVE-2024-1234') });

    analyzeMock.mockResolvedValueOnce({
      suggested_title: 'New Title Only',
      confidence: 0.87,
    });

    const [composable] = withSetup(
      () => useAegisSuggestDescription({
        context: context as AegisSuggestionContextRefs,
        titleRef,
        descriptionRef,
      }), [],
    );

    await composable.suggestDescription();

    expect(titleRef.value).toBe('New Title Only');
    expect(descriptionRef.value).toBe('Original Description');
    expect(composable.hasAppliedTitleSuggestion.value).toBe(true);
  });

  it('shows toast when no suggestions received', async () => {
    const toastStore = (await import('@/stores/ToastStore')).useToastStore();
    const addToast = vi.mocked(toastStore.addToast);
    const titleRef = ref<null | string | undefined>('Original Title');
    const descriptionRef = ref<null | string | undefined>('Original Description');
    const context = createContext({ cveId: ref('CVE-2024-1234') });

    analyzeMock.mockResolvedValueOnce({
      confidence: 0.5,
    });

    const [composable] = withSetup(
      () => useAegisSuggestDescription({
        context: context as AegisSuggestionContextRefs,
        titleRef,
        descriptionRef,
      }), [],
    );

    await composable.suggestDescription();

    expect(addToast).toHaveBeenCalledWith({
      title: 'AI Suggestion',
      body: 'No valid suggestion received.',
    });
  });

  it('reverts title correctly', async () => {
    const titleRef = ref<null | string | undefined>('Original Title');
    const descriptionRef = ref<null | string | undefined>('Original Description');
    const context = createContext({ cveId: ref('CVE-2024-1234') });

    analyzeMock.mockResolvedValueOnce({
      suggested_title: 'New Title',
      suggested_description: 'New Description',
    });

    const [composable] = withSetup(
      () => useAegisSuggestDescription({
        context: context as AegisSuggestionContextRefs,
        titleRef,
        descriptionRef,
      }), [],
    );

    await composable.suggestDescription();
    expect(titleRef.value).toBe('New Title');

    composable.revertTitle();
    expect(titleRef.value).toBe('Original Title');
    expect(composable.hasAppliedTitleSuggestion.value).toBe(false);
  });

  it('reverts description correctly', async () => {
    const titleRef = ref<null | string | undefined>('Original Title');
    const descriptionRef = ref<null | string | undefined>('Original Description');
    const context = createContext({ cveId: ref('CVE-2024-1234') });

    analyzeMock.mockResolvedValueOnce({
      suggested_title: 'New Title',
      suggested_description: 'New Description',
    });

    const [composable] = withSetup(
      () => useAegisSuggestDescription({
        context: context as AegisSuggestionContextRefs,
        titleRef,
        descriptionRef,
      }), [],
    );

    await composable.suggestDescription();
    expect(descriptionRef.value).toBe('New Description');

    composable.revertDescription();
    expect(descriptionRef.value).toBe('Original Description');
    expect(composable.hasAppliedDescriptionSuggestion.value).toBe(false);
  });

  it('shows feedback controls after suggestion is applied', async () => {
    const titleRef = ref<null | string | undefined>('Original Title');
    const descriptionRef = ref<null | string | undefined>('Original Description');
    const context = createContext({ cveId: ref('CVE-2024-1234') });

    analyzeMock.mockResolvedValueOnce({
      suggested_title: 'New Title',
      suggested_description: 'New Description',
    });

    const [composable] = withSetup(
      () => useAegisSuggestDescription({
        context: context as AegisSuggestionContextRefs,
        titleRef,
        descriptionRef,
      }), [],
    );

    expect(composable.canShowTitleFeedback.value).toBe(false);
    expect(composable.canShowDescriptionFeedback.value).toBe(false);

    await composable.suggestDescription();

    expect(composable.canShowTitleFeedback.value).toBe(true);
    expect(composable.canShowDescriptionFeedback.value).toBe(true);
  });

  it('handles service errors gracefully', async () => {
    const toastStore = (await import('@/stores/ToastStore')).useToastStore();
    const addToast = vi.mocked(toastStore.addToast);
    const titleRef = ref<null | string | undefined>('Original Title');
    const descriptionRef = ref<null | string | undefined>('Original Description');
    const context = createContext({ cveId: ref('CVE-2024-1234') });

    analyzeMock.mockRejectedValueOnce({
      data: { detail: 'Service unavailable' },
    });

    const [composable] = withSetup(
      () => useAegisSuggestDescription({
        context: context as AegisSuggestionContextRefs,
        titleRef,
        descriptionRef,
      }), [],
    );

    await composable.suggestDescription();

    expect(addToast).toHaveBeenCalledWith({
      title: 'AI Suggestion Error',
      body: 'Service unavailable',
    });
    expect(composable.isSuggesting.value).toBe(false);
  });
});
