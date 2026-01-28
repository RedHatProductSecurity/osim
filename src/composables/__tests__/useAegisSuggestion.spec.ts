import { ref } from 'vue';

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { useAegisSuggestion } from '@/composables/aegis/useAegisSuggestion';
import {
  serializeAegisContext,
  type AegisSuggestionContextRefs,
} from '@/composables/aegis/useAegisSuggestionContext';
import { useAegisMetadataTracking } from '@/composables/aegis/useAegisMetadataTracking';

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
    isFetching: ref(false),
    requestDuration: ref(1000),
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

describe('useAegisSuggestion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not suggest when CVE ID is invalid and shows a toast', async () => {
    const toastStore = (await import('@/stores/ToastStore')).useToastStore();
    const addToast = vi.mocked(toastStore.addToast);
    const valueRef = ref<null | string>(null);
    const context = createContext({ cveId: ref('INVALID') });

    const [composable] = withSetup(
      () => useAegisSuggestion(context as AegisSuggestionContextRefs, valueRef, 'cwe_id'), [],
    );

    expect(composable.canSuggest.value).toBe(false);
    await composable.suggestCwe();

    expect(analyzeMock).not.toHaveBeenCalled();
    expect(addToast).toHaveBeenCalledWith({ title: 'AI Suggestion', body: 'Valid CVE ID required for suggestions.' });
    expect(composable.isFetchingSuggestion.value).toBe(false);
  });

  it('calls service with expected payload when suggesting', async () => {
    const valueRef = ref<null | string>('CWE-79');
    const context = createContext({ cveId: ref('CVE-2024-1234'), title: ref('Some Title') });

    analyzeMock.mockResolvedValueOnce({
      cwe: ['CWE-89'],
      confidence: 0.9,
      explanation: 'Reasoning',
      tools_used: ['cwe_tool'],
    });

    const [composable] = withSetup(
      () => useAegisSuggestion(context as AegisSuggestionContextRefs, valueRef, 'cwe_id'), [],
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

    analyzeMock.mockResolvedValueOnce({
      cwe: ['CWE-89'],
      confidence: 0.9,
      explanation: 'Reasoning',
      tools_used: ['cwe_tool'],
    });

    const [composable] = withSetup(
      () => useAegisSuggestion(context as AegisSuggestionContextRefs, valueRef, 'cwe_id'), [],
    );

    await composable.suggestCwe();

    expect(valueRef.value).toBe('CWE-89');
    expect(composable.details.value).toEqual({
      cwe: ['CWE-89'],
      confidence: 0.9,
      explanation: 'Reasoning',
      impact: null,
      cvss3_vector: null,
      suggested_statement: null,
      suggested_mitigation: null,
      tools_used: ['cwe_tool'],
    });
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

    analyzeMock.mockResolvedValueOnce({
      cwe: ['CWE-89'],
      confidence: 0.9,
      explanation: 'Reasoning',
      tools_used: ['cwe_tool'],
    });

    const [composable] = withSetup(
      () => useAegisSuggestion(context as AegisSuggestionContextRefs, valueRef, 'cwe_id'), [],
    );

    await composable.suggestCwe();
    composable.revert();

    expect(valueRef.value).toBe('CWE-79');
    expect(composable.hasAppliedSuggestion.value).toBe(false);
    expect(composable.details.value).toEqual({
      cwe: null,
      impact: null,
      cvss3_vector: null,
      suggested_statement: null,
      suggested_mitigation: null,
    });
  });

  it('handles no-suggestion response', async () => {
    const toastStore = (await import('@/stores/ToastStore')).useToastStore();
    const addToast = vi.mocked(toastStore.addToast);
    const valueRef = ref<null | string>('CWE-79');
    const context = createContext();

    analyzeMock.mockResolvedValueOnce({ cwe: [] });

    const [composable] = withSetup(
      () => useAegisSuggestion(context as AegisSuggestionContextRefs, valueRef, 'cwe_id'), [],
    );
    await composable.suggestCwe();

    expect(valueRef.value).toBe('CWE-79');
    expect(composable.hasAppliedSuggestion.value).toBe(false);
    expect(addToast).toHaveBeenCalledWith({ title: 'AI CWE Suggestions', body: 'No valid CWE suggestions received.' });
  });

  it('handles service errors and shows toast', async () => {
    const toastStore = (await import('@/stores/ToastStore')).useToastStore();
    const addToast = vi.mocked(toastStore.addToast);
    const valueRef = ref<null | string>(null);
    const context = createContext();

    analyzeMock.mockRejectedValueOnce({ data: { detail: 'Backend error' } });

    const [composable] = withSetup(
      () => useAegisSuggestion(context as AegisSuggestionContextRefs, valueRef, 'cwe_id'), [],
    );
    await composable.suggestCwe();

    expect(addToast).toHaveBeenCalledWith({ title: 'AI Suggestion Error', body: 'Backend error' });
    expect(composable.isFetchingSuggestion.value).toBe(false);
  });

  it('tracks AI metadata when suggestion is applied', async () => {
    const valueRef = ref<null | string>('CWE-79');
    const context = createContext({ cveId: ref('CVE-2024-1234'), title: ref('Some Title') });
    const tracking = useAegisMetadataTracking();
    tracking.setAegisMetadata({});

    analyzeMock.mockResolvedValueOnce({ cwe: ['CWE-89'], confidence: 0.9, explanation: 'Reasoning' });

    const [composable] = withSetup(
      () => useAegisSuggestion(context as AegisSuggestionContextRefs, valueRef, 'cwe_id'), [],
    );

    await composable.suggestCwe();

    const metadata = tracking.getAegisMetadata();
    expect(metadata.cwe_id[metadata.cwe_id.length - 1].type).toBe('AI');
    expect(tracking.hasAegisChanges()).toBe(true);
  });

  it('removes AI tracking when suggestion is reverted', async () => {
    const valueRef = ref<null | string>('CWE-79');
    const context = createContext({ cveId: ref('CVE-2024-1234'), title: ref('Some Title') });
    const tracking = useAegisMetadataTracking();
    tracking.setAegisMetadata({});

    analyzeMock.mockResolvedValueOnce({ cwe: ['CWE-89'], confidence: 0.9, explanation: 'Reasoning' });

    const [composable] = withSetup(
      () => useAegisSuggestion(context as AegisSuggestionContextRefs, valueRef, 'cwe_id'), [],
    );

    await composable.suggestCwe();
    composable.revert();

    const metadata = tracking.getAegisMetadata();
    expect(metadata.cwe_id).toBeUndefined();
    expect(tracking.hasAegisChanges()).toBe(false);
  });

  it('tracks partial AI when user modifies suggestion', async () => {
    const valueRef = ref<null | string>('CWE-79');
    const context = createContext({ cveId: ref('CVE-2024-1234'), title: ref('Some Title') });
    const tracking = useAegisMetadataTracking();
    tracking.setAegisMetadata({});

    analyzeMock.mockResolvedValueOnce({ cwe: ['CWE-89'], confidence: 0.9, explanation: 'Reasoning' });

    const [composable] = withSetup(
      () => useAegisSuggestion(context as AegisSuggestionContextRefs, valueRef, 'cwe_id'), [],
    );

    await composable.suggestCwe();

    // User modifies the suggestion
    valueRef.value = 'CWE-89 (with additional context)';

    // Wait for watcher to detect change and track immediately
    await new Promise(resolve => setTimeout(resolve, 0));

    // Should detect partial modification and track immediately
    expect(composable.hasPartialModification.value).toBe(true);

    const metadata = tracking.getAegisMetadata();
    // Both AI and Partial AI entries should exist - AI entry is preserved
    expect(metadata.cwe_id).toHaveLength(2);
    const aiEntry = metadata.cwe_id.find(entry => entry.type === 'AI');
    const partialAiEntry = metadata.cwe_id.find(entry => entry.type === 'Partial AI');
    expect(aiEntry).toBeDefined();
    expect(aiEntry?.value).toBe('CWE-89'); // Original AI suggestion
    expect(partialAiEntry).toBeDefined();
    expect(partialAiEntry?.type).toBe('Partial AI');
    expect(partialAiEntry?.value).toBe('CWE-89 (with additional context)');
    expect(tracking.hasAegisChanges()).toBe(true);
  });

  it('tracks as Partial AI when user completely changes suggestion', async () => {
    const valueRef = ref<null | string>('CWE-79');
    const context = createContext({ cveId: ref('CVE-2024-1234'), title: ref('Some Title') });
    const tracking = useAegisMetadataTracking();
    tracking.setAegisMetadata({});

    analyzeMock.mockResolvedValueOnce({ cwe: ['CWE-89'], confidence: 0.9, explanation: 'Reasoning' });

    const [composable] = withSetup(
      () => useAegisSuggestion(context as AegisSuggestionContextRefs, valueRef, 'cwe_id'), [],
    );

    await composable.suggestCwe();

    // User completely changes the value
    valueRef.value = 'CWE-456';

    // Wait for watcher to detect change and track immediately
    await new Promise(resolve => setTimeout(resolve, 0));

    // Should detect partial modification and track immediately
    expect(composable.hasPartialModification.value).toBe(true);

    const metadata = tracking.getAegisMetadata();
    // Both AI and Partial AI entries should exist - AI entry is preserved
    expect(metadata.cwe_id).toHaveLength(2);
    const aiEntry = metadata.cwe_id.find(entry => entry.type === 'AI');
    const partialAiEntry = metadata.cwe_id.find(entry => entry.type === 'Partial AI');
    expect(aiEntry).toBeDefined();
    expect(aiEntry?.value).toBe('CWE-89'); // Original AI suggestion
    expect(partialAiEntry).toBeDefined();
    expect(partialAiEntry?.type).toBe('Partial AI');
    expect(partialAiEntry?.value).toBe('CWE-456');
    expect(tracking.hasAegisChanges()).toBe(true);
    expect(composable.hasAppliedSuggestion.value).toBe(true);
  });

  it('creates only one metadata entry for multiple sequential edits', async () => {
    const valueRef = ref<null | string>('CWE-79');
    const context = createContext({ cveId: ref('CVE-2024-1234'), title: ref('Some Title') });
    const tracking = useAegisMetadataTracking();
    tracking.setAegisMetadata({});

    analyzeMock.mockResolvedValueOnce({ cwe: ['CWE-89'], confidence: 0.9, explanation: 'Reasoning' });

    const [composable] = withSetup(
      () => useAegisSuggestion(context as AegisSuggestionContextRefs, valueRef, 'cwe_id'), [],
    );

    // Apply suggestion first
    await composable.suggestCwe();

    // Simulate multiple sequential edits
    valueRef.value = 'CWE-8';
    await new Promise(resolve => setTimeout(resolve, 0));

    valueRef.value = 'CWE-79';
    await new Promise(resolve => setTimeout(resolve, 0));

    valueRef.value = 'CWE-798';
    await new Promise(resolve => setTimeout(resolve, 0));

    valueRef.value = 'CWE-79 (final)';
    await new Promise(resolve => setTimeout(resolve, 0));

    // Should have both AI and Partial AI entries - AI entry is preserved
    // Partial AI entry contains first modification value (not final)
    const metadata = tracking.getAegisMetadata();
    expect(metadata.cwe_id).toHaveLength(2);
    const aiEntry = metadata.cwe_id.find(entry => entry.type === 'AI');
    const partialAiEntry = metadata.cwe_id.find(entry => entry.type === 'Partial AI');
    expect(aiEntry).toBeDefined();
    expect(aiEntry?.value).toBe('CWE-89'); // Original AI suggestion
    expect(partialAiEntry).toBeDefined();
    expect(partialAiEntry?.type).toBe('Partial AI');
    expect(partialAiEntry?.value).toBe('CWE-8'); // First modification value (not final)
    expect(composable.hasPartialModification.value).toBe(true);
  });
});

describe('useAegisSuggestion - Multiple Suggestions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('handles multiple CWE suggestions correctly', async () => {
    const valueRef = ref<null | string>('CWE-79');
    const context = createContext({ cveId: ref('CVE-2024-1234'), title: ref('Some Title') });

    analyzeMock.mockResolvedValueOnce({
      cwe: ['CWE-89', 'CWE-79', 'CWE-20'],
      confidence: 0.9,
      explanation: 'Multiple suggestions',
      tools_used: ['cwe_tool'],
    });

    const [composable] = withSetup(
      () => useAegisSuggestion(context as AegisSuggestionContextRefs, valueRef, 'cwe_id'), [],
    );

    await composable.suggestCwe();

    expect(composable.allSuggestions.value).toEqual(['CWE-89', 'CWE-79', 'CWE-20']);
    expect(composable.hasMultipleSuggestions.value).toBe(true);
    expect(composable.currentSuggestion.value).toBe('CWE-89');
    expect(composable.selectedSuggestionIndex.value).toBe(0);
    expect(valueRef.value).toBe('CWE-89');
  });

  it('allows selecting different suggestions', async () => {
    const valueRef = ref<null | string>('CWE-79');
    const context = createContext({ cveId: ref('CVE-2024-1234'), title: ref('Some Title') });

    analyzeMock.mockResolvedValueOnce({
      cwe: ['CWE-89', 'CWE-79', 'CWE-20'],
      confidence: 0.9,
      explanation: 'Multiple suggestions',
      tools_used: ['cwe_tool'],
    });

    const [composable] = withSetup(
      () => useAegisSuggestion(context as AegisSuggestionContextRefs, valueRef, 'cwe_id'), [],
    );

    await composable.suggestCwe();

    // Select the second suggestion
    composable.selectSuggestion(1);

    expect(composable.selectedSuggestionIndex.value).toBe(1);
    expect(composable.currentSuggestion.value).toBe('CWE-79');
    expect(valueRef.value).toBe('CWE-79');

    // Select the third suggestion
    composable.selectSuggestion(2);

    expect(composable.selectedSuggestionIndex.value).toBe(2);
    expect(composable.currentSuggestion.value).toBe('CWE-20');
    expect(valueRef.value).toBe('CWE-20');
  });

  it('handles single suggestion without multiple suggestion features', async () => {
    const valueRef = ref<null | string>('CWE-79');
    const context = createContext({ cveId: ref('CVE-2024-1234'), title: ref('Some Title') });

    analyzeMock.mockResolvedValueOnce({
      cwe: ['CWE-89'],
      confidence: 0.9,
      explanation: 'Single suggestion',
      tools_used: ['cwe_tool'],
    });

    const [composable] = withSetup(
      () => useAegisSuggestion(context as AegisSuggestionContextRefs, valueRef, 'cwe_id'), [],
    );

    await composable.suggestCwe();

    expect(composable.allSuggestions.value).toEqual(['CWE-89']);
    expect(composable.hasMultipleSuggestions.value).toBe(false);
    expect(composable.currentSuggestion.value).toBe('CWE-89');
    expect(composable.selectedSuggestionIndex.value).toBe(0);
  });

  it('revert resets selected suggestion index', async () => {
    const valueRef = ref<null | string>('CWE-79');
    const context = createContext({ cveId: ref('CVE-2024-1234'), title: ref('Some Title') });

    analyzeMock.mockResolvedValueOnce({
      cwe: ['CWE-89', 'CWE-79', 'CWE-20'],
      confidence: 0.9,
      explanation: 'Multiple suggestions',
      tools_used: ['cwe_tool'],
    });

    const [composable] = withSetup(
      () => useAegisSuggestion(context as AegisSuggestionContextRefs, valueRef, 'cwe_id'), [],
    );

    await composable.suggestCwe();
    composable.selectSuggestion(2);
    composable.revert();

    expect(composable.selectedSuggestionIndex.value).toBe(0);
    expect(composable.details.value).toEqual({
      cwe: null,
      impact: null,
      cvss3_vector: null,
      suggested_statement: null,
      suggested_mitigation: null,
    });
    expect(valueRef.value).toBe('CWE-79');
  });
});

describe('useAegisSuggestion - Empty Suggestions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('accepts empty string as valid statement suggestion', async () => {
    const toastStore = (await import('@/stores/ToastStore')).useToastStore();
    const addToast = vi.mocked(toastStore.addToast);
    const valueRef = ref<null | string>('Some existing statement');
    const context = createContext({ cveId: ref('CVE-2024-1234'), title: ref('Some Title') });

    analyzeMock.mockResolvedValueOnce({
      suggested_statement: '',
      confidence: 0.95,
      explanation: 'This CVE should have an empty statement',
      tools_used: ['statement_tool'],
    });

    const [composable] = withSetup(
      () => useAegisSuggestion(context as AegisSuggestionContextRefs, valueRef, 'statement'), [],
    );

    await composable.suggestStatement();

    expect(valueRef.value).toBe('');
    expect(composable.details.value.suggested_statement).toBe('');
    expect(composable.hasAppliedSuggestion.value).toBe(true);
    expect(composable.canShowFeedback.value).toBe(true);
    expect(composable.allSuggestions.value).toEqual(['']);
    expect(addToast).toHaveBeenCalledWith({
      title: 'AI Suggestion Applied',
      body: 'Suggestion applied. Always review AI generated responses prior to use.',
      css: 'info',
      timeoutMs: 8000,
    });
  });

  it('rejects null as invalid statement suggestion', async () => {
    const toastStore = (await import('@/stores/ToastStore')).useToastStore();
    const addToast = vi.mocked(toastStore.addToast);
    const valueRef = ref<null | string>('Some existing statement');
    const context = createContext({ cveId: ref('CVE-2024-1234'), title: ref('Some Title') });

    analyzeMock.mockResolvedValueOnce({
      suggested_statement: null,
      confidence: 0.5,
      explanation: 'Could not determine statement',
      tools_used: ['statement_tool'],
    });

    const [composable] = withSetup(
      () => useAegisSuggestion(context as AegisSuggestionContextRefs, valueRef, 'statement'), [],
    );

    await composable.suggestStatement();

    expect(valueRef.value).toBe('Some existing statement');
    expect(composable.hasAppliedSuggestion.value).toBe(false);
    expect(addToast).toHaveBeenCalledWith({
      title: 'AI Statement Suggestions',
      body: 'No valid statement suggestion received.',
    });
  });

  it('rejects undefined as invalid statement suggestion', async () => {
    const toastStore = (await import('@/stores/ToastStore')).useToastStore();
    const addToast = vi.mocked(toastStore.addToast);
    const valueRef = ref<null | string>('Some existing statement');
    const context = createContext({ cveId: ref('CVE-2024-1234'), title: ref('Some Title') });

    analyzeMock.mockResolvedValueOnce({
      confidence: 0.5,
      explanation: 'Could not determine statement',
      tools_used: ['statement_tool'],
    });

    const [composable] = withSetup(
      () => useAegisSuggestion(context as AegisSuggestionContextRefs, valueRef, 'statement'), [],
    );

    await composable.suggestStatement();

    expect(valueRef.value).toBe('Some existing statement');
    expect(composable.hasAppliedSuggestion.value).toBe(false);
    expect(addToast).toHaveBeenCalledWith({
      title: 'AI Statement Suggestions',
      body: 'No valid statement suggestion received.',
    });
  });

  it('accepts empty string as valid mitigation suggestion', async () => {
    const toastStore = (await import('@/stores/ToastStore')).useToastStore();
    const addToast = vi.mocked(toastStore.addToast);
    const valueRef = ref<null | string>('Some existing mitigation');
    const context = createContext({ cveId: ref('CVE-2024-1234'), title: ref('Some Title') });

    analyzeMock.mockResolvedValueOnce({
      suggested_mitigation: '',
      confidence: 0.95,
      explanation: 'This CVE should have an empty mitigation',
      tools_used: ['mitigation_tool'],
    });

    const [composable] = withSetup(
      () => useAegisSuggestion(context as AegisSuggestionContextRefs, valueRef, 'mitigation'), [],
    );

    await composable.suggestMitigation();

    expect(valueRef.value).toBe('');
    expect(composable.details.value.suggested_mitigation).toBe('');
    expect(composable.hasAppliedSuggestion.value).toBe(true);
    expect(composable.canShowFeedback.value).toBe(true);
    expect(composable.allSuggestions.value).toEqual(['']);
    expect(addToast).toHaveBeenCalledWith({
      title: 'AI Suggestion Applied',
      body: 'Suggestion applied. Always review AI generated responses prior to use.',
      css: 'info',
      timeoutMs: 8000,
    });
  });

  it('rejects null as invalid mitigation suggestion', async () => {
    const toastStore = (await import('@/stores/ToastStore')).useToastStore();
    const addToast = vi.mocked(toastStore.addToast);
    const valueRef = ref<null | string>('Some existing mitigation');
    const context = createContext({ cveId: ref('CVE-2024-1234'), title: ref('Some Title') });

    analyzeMock.mockResolvedValueOnce({
      suggested_mitigation: null,
      confidence: 0.5,
      explanation: 'Could not determine mitigation',
      tools_used: ['mitigation_tool'],
    });

    const [composable] = withSetup(
      () => useAegisSuggestion(context as AegisSuggestionContextRefs, valueRef, 'mitigation'), [],
    );

    await composable.suggestMitigation();

    expect(valueRef.value).toBe('Some existing mitigation');
    expect(composable.hasAppliedSuggestion.value).toBe(false);
    expect(addToast).toHaveBeenCalledWith({
      title: 'AI Mitigation Suggestions',
      body: 'No valid mitigation suggestion received.',
    });
  });

  describe('feedback limitation', () => {
    it('should prevent multiple feedback submissions for the same suggestion', async () => {
      const valueRef = ref<string>('');
      const context = {
        cveId: ref('CVE-2024-1234'),
      };

      analyzeMock.mockResolvedValue({
        impact: 'MODERATE',
      });

      const [composable] = withSetup(
        () => useAegisSuggestion(context as AegisSuggestionContextRefs, valueRef, 'impact'), [],
      );

      // Apply suggestion first
      await composable.suggestImpact();
      expect(composable.canShowFeedback.value).toBe(true);

      // Submit feedback
      await composable.sendFeedback('positive');
      expect(sendFeedbackMock).toHaveBeenCalledTimes(1);
      expect(composable.canShowFeedback.value).toBe(false);

      // Try to submit feedback again - should be prevented
      await composable.sendFeedback('negative', 'Not helpful');
      expect(sendFeedbackMock).toHaveBeenCalledTimes(1); // Still only called once
      expect(mockAddToast).toHaveBeenCalledWith({
        title: 'Feedback Already Submitted',
        body: 'You have already provided feedback for this suggestion.',
        css: 'warning',
      });
    });

    it('should allow feedback for different suggestions', async () => {
      const valueRef = ref<string>('');
      const context = {
        cveId: ref('CVE-2024-1234'),
      };

      // First suggestion
      analyzeMock.mockResolvedValueOnce({
        impact: 'MODERATE',
      });

      const [composable] = withSetup(
        () => useAegisSuggestion(context as AegisSuggestionContextRefs, valueRef, 'impact'), [],
      );

      await composable.suggestImpact();
      await composable.sendFeedback('positive');
      expect(sendFeedbackMock).toHaveBeenCalledTimes(1);

      // Second different suggestion
      analyzeMock.mockResolvedValueOnce({
        impact: 'CRITICAL',
      });

      await composable.suggestImpact();
      expect(composable.canShowFeedback.value).toBe(true); // Should allow feedback for new suggestion

      await composable.sendFeedback('negative');
      expect(sendFeedbackMock).toHaveBeenCalledTimes(2); // Should be called again
    });
  });
});
