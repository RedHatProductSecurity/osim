import { ref } from 'vue';

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { useAegisSuggestTitle } from '@/composables/aegis/useAegisSuggestTitle';
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

vi.mock('@/stores/UserStore', () => ({
  useUserStore: vi.fn(() => ({
    userEmail: 'test@example.com',
  })),
}));

const analyzeMock = vi.fn();
const sendFeedbackMock = vi.fn();
vi.mock('@/services/AegisAIService', () => ({
  AegisAIService: vi.fn().mockImplementation(() => ({
    analyzeCVEWithContext: analyzeMock,
    sendFeedback: sendFeedbackMock,
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

describe('useAegisSuggestTitle', () => {
  it('applies title suggestion correctly', async () => {
    const toastStore = (await import('@/stores/ToastStore')).useToastStore();
    const addToast = vi.mocked(toastStore.addToast);
    const titleRef = ref<null | string | undefined>('Original Title');
    const context = createContext({ cveId: ref('CVE-2024-1234') });

    analyzeMock.mockResolvedValueOnce({
      suggested_title: 'New Suggested Title',
      suggested_description: 'Generated description',
      confidence: 0.95,
      explanation: 'Analysis reasoning',
      tools_used: ['ai_tool'],
    });

    const [composable] = withSetup(
      () => useAegisSuggestTitle({
        context: context as AegisSuggestionContextRefs,
        titleRef,
      }), [],
    );

    await composable.suggestTitle();

    expect(titleRef.value).toBe('New Suggested Title');
    expect(composable.hasAppliedTitleSuggestion.value).toBe(true);
    expect(composable.details.value).toMatchObject({
      suggested_title: 'New Suggested Title',
      confidence: 0.95,
    });
    expect(addToast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'AI Suggestion Applied',
      css: 'info',
    }));
  });

  it('shows toast when no title suggestion received', async () => {
    const titleRef = ref<null | string | undefined>('Original Title');
    const context = createContext({ cveId: ref('CVE-2024-1234') });

    analyzeMock.mockResolvedValueOnce({
      suggested_title: '',
      suggested_description: 'Some description',
      confidence: 0.95,
    });

    const [composable] = withSetup(
      () => useAegisSuggestTitle({
        context: context as AegisSuggestionContextRefs,
        titleRef,
      }), [],
    );

    await composable.suggestTitle();

    expect(mockAddToast).toHaveBeenCalledWith({
      title: 'AI Suggestion',
      body: 'No valid title suggestion received.',
    });
  });

  it('reverts title correctly', async () => {
    const titleRef = ref<null | string | undefined>('Original Title');
    const context = createContext({ cveId: ref('CVE-2024-1234') });

    analyzeMock.mockResolvedValueOnce({
      suggested_title: 'New Title',
      suggested_description: 'New Description',
      confidence: 0.92,
    });

    const [composable] = withSetup(
      () => useAegisSuggestTitle({
        context: context as AegisSuggestionContextRefs,
        titleRef,
      }), [],
    );

    await composable.suggestTitle();
    expect(titleRef.value).toBe('New Title');

    composable.revertTitle();
    expect(titleRef.value).toBe('Original Title');
    expect(composable.hasAppliedTitleSuggestion.value).toBe(false);
    expect(composable.details.value).toBe(null);
  });

  it('shows feedback controls after suggestion is applied', async () => {
    const titleRef = ref<null | string | undefined>('Original Title');
    const context = createContext({ cveId: ref('CVE-2024-1234') });

    analyzeMock.mockResolvedValueOnce({
      suggested_title: 'New Title',
      suggested_description: 'New Description',
      confidence: 0.92,
    });

    const [composable] = withSetup(
      () => useAegisSuggestTitle({
        context: context as AegisSuggestionContextRefs,
        titleRef,
      }), [],
    );

    expect(composable.canShowTitleFeedback.value).toBe(false);

    await composable.suggestTitle();

    expect(composable.canShowTitleFeedback.value).toBe(true);
  });

  it('handles service errors gracefully', async () => {
    const titleRef = ref<null | string | undefined>('Original Title');
    const context = createContext({ cveId: ref('CVE-2024-1234') });

    analyzeMock.mockRejectedValueOnce(new Error('Service unavailable'));

    const [composable] = withSetup(
      () => useAegisSuggestTitle({
        context: context as AegisSuggestionContextRefs,
        titleRef,
      }), [],
    );

    await composable.suggestTitle();

    expect(mockAddToast).toHaveBeenCalledWith({
      title: 'AI Suggestion Error',
      body: 'Service unavailable',
    });
  });

  it('sends feedback successfully', async () => {
    const titleRef = ref<null | string | undefined>('Original Title');
    const context = createContext({ cveId: ref('CVE-2024-1234') });

    analyzeMock.mockResolvedValueOnce({
      suggested_title: 'New Title',
      suggested_description: 'New Description',
      confidence: 0.92,
    });

    sendFeedbackMock.mockResolvedValueOnce({});

    const [composable] = withSetup(
      () => useAegisSuggestTitle({
        context: context as AegisSuggestionContextRefs,
        titleRef,
      }), [],
    );

    await composable.suggestTitle();
    await composable.sendTitleFeedback('positive');

    expect(sendFeedbackMock).toHaveBeenCalledWith({
      feature: 'suggest-title',
      cve_id: 'CVE-2024-1234',
      email: 'test@example.com',
      request_time: expect.stringMatching(/\d+ms/),
      actual: 'New Title',
      accept: true,
    });

    expect(mockAddToast).toHaveBeenCalledWith({
      title: 'AI Suggestion Feedback',
      body: 'Thanks for the positive feedback.',
      css: 'info',
    });
  });

  it('prevents duplicate feedback submission', async () => {
    const titleRef = ref<null | string | undefined>('Original Title');
    const context = createContext({ cveId: ref('CVE-2024-1234') });

    analyzeMock.mockResolvedValueOnce({
      suggested_title: 'New Title',
      suggested_description: 'New Description',
      confidence: 0.92,
    });

    sendFeedbackMock.mockResolvedValueOnce({});

    const [composable] = withSetup(
      () => useAegisSuggestTitle({
        context: context as AegisSuggestionContextRefs,
        titleRef,
      }), [],
    );

    await composable.suggestTitle();
    await composable.sendTitleFeedback('positive');

    // Try to send feedback again
    await composable.sendTitleFeedback('negative');

    expect(sendFeedbackMock).toHaveBeenCalledTimes(1);
    expect(mockAddToast).toHaveBeenLastCalledWith({
      title: 'Feedback Already Submitted',
      body: 'You have already provided feedback for this title suggestion.',
      css: 'warning',
    });
  });
});
