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

vi.mock('@/stores/UserStore', () => ({
  useUserStore: vi.fn(() => ({
    userEmail: 'test@example.com',
  })),
}));

const analyzeMock = vi.fn();
const sendFeedbackMock = vi.fn();
vi.mock('@/services/AegisAIService', () => ({
  AegisAIService: vi.fn().mockImplementation(function () {
    return {
      analyzeCVEWithContext: analyzeMock,
      sendFeedback: sendFeedbackMock,
    };
  }),
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
  it('applies description suggestion correctly', async () => {
    const toastStore = (await import('@/stores/ToastStore')).useToastStore();
    const addToast = vi.mocked(toastStore.addToast);
    const descriptionRef = ref<null | string | undefined>('Original Description');
    const context = createContext({ cveId: ref('CVE-2024-1234') });

    analyzeMock.mockResolvedValueOnce({
      suggested_description: 'New Suggested Description',
      confidence: 0.95,
      explanation: 'Analysis reasoning',
      tools_used: ['ai_tool'],
    });

    const [composable] = withSetup(
      () => useAegisSuggestDescription({
        context: context as AegisSuggestionContextRefs,
        descriptionRef,
      }), [],
    );

    await composable.suggestDescription();

    expect(descriptionRef.value).toBe('New Suggested Description');
    expect(composable.hasAppliedDescriptionSuggestion.value).toBe(true);
    expect(composable.details.value).toMatchObject({
      suggested_description: 'New Suggested Description',
      confidence: 0.95,
    });
    expect(addToast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'AI Suggestion Applied',
      css: 'info',
    }));
  });

  it('shows toast when no description suggestion received', async () => {
    const descriptionRef = ref<null | string | undefined>('Original Description');
    const context = createContext({ cveId: ref('CVE-2024-1234') });

    analyzeMock.mockResolvedValueOnce({
      suggested_description: '',
      confidence: 0.95,
    });

    const [composable] = withSetup(
      () => useAegisSuggestDescription({
        context: context as AegisSuggestionContextRefs,
        descriptionRef,
      }), [],
    );

    await composable.suggestDescription();

    expect(mockAddToast).toHaveBeenCalledWith({
      title: 'AI Suggestion',
      body: 'No valid description suggestion received.',
    });
  });

  it('reverts description correctly', async () => {
    const descriptionRef = ref<null | string | undefined>('Original Description');
    const context = createContext({ cveId: ref('CVE-2024-1234') });

    analyzeMock.mockResolvedValueOnce({
      suggested_description: 'New Description',
      confidence: 0.92,
    });

    const [composable] = withSetup(
      () => useAegisSuggestDescription({
        context: context as AegisSuggestionContextRefs,
        descriptionRef,
      }), [],
    );

    await composable.suggestDescription();
    expect(descriptionRef.value).toBe('New Description');

    composable.revertDescription();
    expect(descriptionRef.value).toBe('Original Description');
    expect(composable.hasAppliedDescriptionSuggestion.value).toBe(false);
    expect(composable.details.value).toBe(null);
  });

  it('shows feedback controls after suggestion is applied', async () => {
    const descriptionRef = ref<null | string | undefined>('Original Description');
    const context = createContext({ cveId: ref('CVE-2024-1234') });

    analyzeMock.mockResolvedValueOnce({
      suggested_description: 'New Description',
      confidence: 0.92,
    });

    const [composable] = withSetup(
      () => useAegisSuggestDescription({
        context: context as AegisSuggestionContextRefs,
        descriptionRef,
      }), [],
    );

    expect(composable.canShowDescriptionFeedback.value).toBe(false);

    await composable.suggestDescription();

    expect(composable.canShowDescriptionFeedback.value).toBe(true);
  });

  it('handles service errors gracefully', async () => {
    const descriptionRef = ref<null | string | undefined>('Original Description');
    const context = createContext({ cveId: ref('CVE-2024-1234') });

    analyzeMock.mockRejectedValueOnce(new Error('Service unavailable'));

    const [composable] = withSetup(
      () => useAegisSuggestDescription({
        context: context as AegisSuggestionContextRefs,
        descriptionRef,
      }), [],
    );

    await composable.suggestDescription();

    expect(mockAddToast).toHaveBeenCalledWith({
      title: 'AI Suggestion Error',
      body: 'Service unavailable',
    });
  });

  it('sends feedback successfully', async () => {
    const descriptionRef = ref<null | string | undefined>('Original Description');
    const context = createContext({ cveId: ref('CVE-2024-1234') });

    analyzeMock.mockResolvedValueOnce({
      suggested_description: 'New Description',
      confidence: 0.92,
    });

    sendFeedbackMock.mockResolvedValueOnce({});

    const [composable] = withSetup(
      () => useAegisSuggestDescription({
        context: context as AegisSuggestionContextRefs,
        descriptionRef,
      }), [],
    );

    await composable.suggestDescription();
    await composable.sendDescriptionFeedback('positive');

    expect(sendFeedbackMock).toHaveBeenCalledWith({
      feature: 'suggest-description',
      cve_id: 'CVE-2024-1234',
      email: 'test@example.com',
      request_time: expect.stringMatching(/\d+ms/),
      actual: 'New Description',
      accept: true,
    });

    expect(mockAddToast).toHaveBeenCalledWith({
      title: 'AI Suggestion Feedback',
      body: 'Thanks for the positive feedback.',
      css: 'info',
    });
  });

  it('prevents duplicate feedback submission', async () => {
    const descriptionRef = ref<null | string | undefined>('Original Description');
    const context = createContext({ cveId: ref('CVE-2024-1234') });

    analyzeMock.mockResolvedValueOnce({
      suggested_description: 'New Description',
      confidence: 0.92,
    });

    sendFeedbackMock.mockResolvedValueOnce({});

    const [composable] = withSetup(
      () => useAegisSuggestDescription({
        context: context as AegisSuggestionContextRefs,
        descriptionRef,
      }), [],
    );

    await composable.suggestDescription();
    await composable.sendDescriptionFeedback('positive');

    // Try to send feedback again
    await composable.sendDescriptionFeedback('negative');

    expect(sendFeedbackMock).toHaveBeenCalledTimes(1);
    expect(mockAddToast).toHaveBeenLastCalledWith({
      title: 'Feedback Already Submitted',
      body: 'You have already provided feedback for this description suggestion.',
      css: 'warning',
    });
  });
});
