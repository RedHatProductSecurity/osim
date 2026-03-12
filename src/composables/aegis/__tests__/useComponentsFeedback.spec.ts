import { ref } from 'vue';

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { useComponentsFeedback, AegisFeedback } from '@/composables/aegis/useComponentsFeedback';

// Mock the dependencies
vi.mock('@/composables/aegis/useAegisMetadataTracking', () => ({
  useAegisMetadataTracking: () => ({
    isFieldValueAIBot: vi.fn().mockReturnValue(true),
  }),
}));

vi.mock('@/composables/useFlaw', () => ({
  useFlaw: () => ({
    flaw: { value: { cve_id: 'CVE-2023-1234' } },
  }),
}));

vi.mock('@/services/AegisAIService', () => ({
  AegisAIService: vi.fn().mockImplementation(() => ({
    sendFeedback: vi.fn().mockResolvedValue({}),
    requestDuration: { value: 100 },
  })),
}));

vi.mock('@/stores/UserStore', () => ({
  useUserStore: () => ({
    userEmail: 'test@example.com',
  }),
}));

vi.mock('@/stores/ToastStore', () => ({
  useToastStore: () => ({
    addToast: vi.fn(),
  }),
}));

describe('useComponentsFeedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show feedback when components are highlighted', () => {
    const componentsRef = ref(['kernel', 'openssl']);
    const { canShowComponentsFeedback } = useComponentsFeedback(componentsRef);

    expect(canShowComponentsFeedback.value).toBe(true);
  });

  it('should not show feedback when no components', () => {
    const componentsRef = ref(null);
    const { canShowComponentsFeedback } = useComponentsFeedback(componentsRef);

    expect(canShowComponentsFeedback.value).toBe(false);
  });

  it('should handle feedback submission', async () => {
    const componentsRef = ref(['kernel', 'openssl']);
    const { canShowComponentsFeedback, handleComponentsFeedback } = useComponentsFeedback(componentsRef);

    expect(canShowComponentsFeedback.value).toBe(true);

    await handleComponentsFeedback(AegisFeedback.POSITIVE);

    // After feedback, should not show feedback anymore
    expect(canShowComponentsFeedback.value).toBe(false);
  });
});
