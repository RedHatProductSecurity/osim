import { ref } from 'vue';

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { useAegisSuggestComponents } from '@/composables/aegis/useAegisSuggestComponents';

// Mock dependencies
vi.mock('@/composables/aegis/useAegisSuggestionContext', () => ({
  serializeAegisContext: vi.fn(() => ({
    cve_id: 'CVE-2023-1234',
    title: 'Test CVE',
    description: 'Test description',
  })),
}));

vi.mock('@/composables/aegis/useAISuggestionsWatcher', () => ({
  useAISuggestionsWatcher: vi.fn(() => ({
    hasAppliedSuggestion: ref(false),
    trackSuggestionApplied: vi.fn(),
    trackSuggestionReverted: vi.fn(),
  })),
}));

vi.mock('@/composables/aegis/useUnifiedAegisFeedback', () => ({
  useSimpleFeedback: vi.fn(() => ({
    sendFeedback: vi.fn(),
  })),
}));

vi.mock('@/services/AegisAIService', () => ({
  AegisAIService: vi.fn(() => ({
    isFetching: ref(false),
    analyzeCVEWithContext: vi.fn(),
  })),
}));

vi.mock('@/stores/ToastStore', () => ({
  useToastStore: vi.fn(() => ({
    addToast: vi.fn(),
  })),
}));

describe('useAegisSuggestComponents', () => {
  let mockContext: any;
  let mockValueRef: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockContext = {
      cveId: ref('CVE-2023-1234'),
      title: ref('Test CVE'),
      description: ref('Test description'),
    };
    mockValueRef = ref<null | string[]>(null);
  });

  it('should initialize with default values', () => {
    const result = useAegisSuggestComponents(mockContext, mockValueRef);

    expect(result.allSuggestions.value).toEqual([]);
    expect(result.hasAppliedSuggestion.value).toBe(false);
    expect(result.canShowFeedback.value).toBe(false);
    expect(result.selectedSuggestionIndex.value).toBe(0);
  });

  it('should validate CVE ID correctly', () => {
    mockContext.cveId = ref('CVE-2023-1234');
    const result = useAegisSuggestComponents(mockContext, mockValueRef);

    expect(result.canSuggest.value).toBe(true);

    mockContext.cveId = ref('invalid-cve');
    const result2 = useAegisSuggestComponents(mockContext, mockValueRef);

    expect(result2.canSuggest.value).toBe(false);
  });

  it('should handle suggestion selection', () => {
    const result = useAegisSuggestComponents(mockContext, mockValueRef);

    // Test the selectSuggestion method exists
    expect(typeof result.selectSuggestion).toBe('function');
    expect(typeof result.revert).toBe('function');
  });
});
