import { unref } from 'vue';

import { useFlaw } from '@/composables/useFlaw';

import { AegisAIService } from '@/services/AegisAIService';
import { useToastStore } from '@/stores/ToastStore';
import { useUserStore } from '@/stores/UserStore';

const FeatureNameForFeedback: Record<string, string> = {
  cwe_id: 'suggest-cwe',
  impact: 'suggest-impact',
  _cvss3_vector: 'suggest-cvss',
  statement: 'suggest-statement',
  mitigation: 'suggest-mitigation',
  components: 'source_component',
  title: 'suggest-title',
  description: 'suggest-description',
};

function normalizeActualValue(value: unknown): string {
  if (Array.isArray(value)) {
    return JSON.stringify(value);
  }
  return String(value || '');
}

export function useSimpleFeedback() {
  const { flaw } = useFlaw();
  const toastStore = useToastStore();
  const userStore = useUserStore();
  const service = new AegisAIService();

  async function sendFeedback(
    fieldName: string,
    actualValue: unknown,
    kind: 'negative' | 'positive',
    comment?: string,
    feature?: string,
  ): Promise<boolean> {
    if (actualValue == null) {
      return false;
    }

    const normalizedActualValue = normalizeActualValue(actualValue);
    const resolvedFeature = feature || FeatureNameForFeedback[fieldName] || fieldName;

    try {
      const cveId = unref(flaw.value.cve_id);
      if (!cveId) {
        toastStore.addToast({
          title: 'Feedback Error',
          body: 'Cannot submit feedback without a valid CVE ID.',
          css: 'danger',
        });
        return false;
      }

      await service.sendFeedback({
        feature: resolvedFeature,
        cve_id: cveId,
        email: userStore.userEmail,
        request_time: `${service.requestDuration.value}ms`,
        actual: normalizedActualValue,
        accept: kind === 'positive',
        ...(comment && { rejection_comment: comment }),
      });

      toastStore.addToast({
        title: 'Aegis-AI-Bot Feedback',
        body: kind === 'positive' ? 'Thanks for the positive feedback.' : 'Thanks for the feedback.',
        css: 'info',
      });

      return true;
    } catch (error: any) {
      const detail = error?.data?.detail ?? error?.response?.data?.detail;
      const msg = typeof detail === 'string'
        ? detail
        : (error?.message ?? 'Failed to submit feedback');
      toastStore.addToast({
        title: 'Feedback Error',
        body: msg,
        css: 'danger',
      });
      return false;
    }
  }

  return { sendFeedback };
}
