import { ref } from 'vue';

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { useSimpleFeedback } from '@/composables/aegis/useUnifiedAegisFeedback';

// Mock dependencies
const mockAddToast = vi.fn();
vi.mock('@/stores/ToastStore', () => ({
  useToastStore: () => ({
    addToast: mockAddToast,
  }),
}));

vi.mock('@/stores/UserStore', () => ({
  useUserStore: () => ({
    userEmail: 'test@example.com',
  }),
}));

vi.mock('@/composables/useFlaw', () => ({
  useFlaw: () => ({
    flaw: ref({ cve_id: 'CVE-2024-1234' }),
  }),
}));

const mockSendFeedback = vi.fn();
vi.mock('@/services/AegisAIService', () => ({
  AegisAIService: vi.fn(() => ({
    sendFeedback: mockSendFeedback,
    requestDuration: ref(1000),
  })),
}));

describe('useSimpleFeedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sendFeedback', () => {
    it('should send feedback with correct parameters for string values', async () => {
      const { sendFeedback } = useSimpleFeedback();

      const result = await sendFeedback('impact', 'HIGH', 'negative', 'Wrong suggestion');

      expect(result).toBe(true);
      expect(mockSendFeedback).toHaveBeenCalledTimes(1);
      expect(mockSendFeedback).toHaveBeenCalledWith({
        feature: 'suggest-impact',
        cve_id: 'CVE-2024-1234',
        email: 'test@example.com',
        request_time: '1000ms',
        actual: 'HIGH',
        accept: false,
        rejection_comment: 'Wrong suggestion',
      });
      expect(mockAddToast).toHaveBeenCalledWith({
        title: 'Aegis-AI-Bot Feedback',
        body: 'Thanks for the feedback.',
        css: 'info',
      });
    });

    it('should send feedback with correct parameters for array values', async () => {
      const { sendFeedback } = useSimpleFeedback();

      const result = await sendFeedback('components', ['kernel', 'httpd'], 'positive');

      expect(result).toBe(true);
      expect(mockSendFeedback).toHaveBeenCalledTimes(1);
      expect(mockSendFeedback).toHaveBeenCalledWith({
        feature: 'source_component',
        cve_id: 'CVE-2024-1234',
        email: 'test@example.com',
        request_time: '1000ms',
        actual: '["kernel","httpd"]',
        accept: true,
      });
    });

    it('should allow multiple feedback calls (UI controls visibility)', async () => {
      const { sendFeedback } = useSimpleFeedback();

      // Multiple calls should all go through - UI prevents duplicates
      await sendFeedback('impact', 'HIGH', 'negative', 'Wrong');
      await sendFeedback('impact', 'HIGH', 'positive', 'Actually good');

      expect(mockSendFeedback).toHaveBeenCalledTimes(2);
    });

    it('should handle API errors', async () => {
      mockSendFeedback.mockRejectedValueOnce(new Error('Network error'));

      const { sendFeedback } = useSimpleFeedback();
      const result = await sendFeedback('impact', 'HIGH', 'negative', 'Wrong');

      expect(result).toBe(false);
      expect(mockAddToast).toHaveBeenCalledWith({
        title: 'Feedback Error',
        body: 'Network error',
        css: 'danger',
      });
    });

    it('should reject null values', async () => {
      const { sendFeedback } = useSimpleFeedback();
      const result = await sendFeedback('impact', null, 'positive');

      expect(result).toBe(false);
      expect(mockSendFeedback).not.toHaveBeenCalled();
    });

    it('should allow empty string values', async () => {
      const { sendFeedback } = useSimpleFeedback();
      const result = await sendFeedback('statement', '', 'positive', 'Empty is valid');

      expect(result).toBe(true);
      expect(mockSendFeedback).toHaveBeenCalledWith(
        expect.objectContaining({ actual: '' }),
      );
    });
  });
});
