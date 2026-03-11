import { computed, ref, type Ref } from 'vue';

import { useAegisMetadataTracking } from '@/composables/aegis/useAegisMetadataTracking';
import { useFlaw } from '@/composables/useFlaw';

import { AegisAIService } from '@/services/AegisAIService';
import { useToastStore } from '@/stores/ToastStore';
import { useUserStore } from '@/stores/UserStore';

export function useComponentsFeedback(componentsRef: Ref<null | string[] | undefined>) {
  const { isFieldValueAIBot } = useAegisMetadataTracking();
  const service = new AegisAIService();
  const { flaw } = useFlaw();
  const userStore = useUserStore();
  const toastStore = useToastStore();

  const componentsFeedbackSubmitted = ref<Set<string>>(new Set());
  const showComponentsFeedbackModal = ref(false);

  // Helper function to check if an array field was populated by AI-Bot
  const isArrayFieldValueAIBot = (fieldName: string, currentValue: null | string[] | undefined): boolean => {
    if (!currentValue) return false;
    // Pass the raw value directly
    return isFieldValueAIBot(fieldName, currentValue);
  };

  const canShowComponentsFeedback = computed(() => {
    if (!componentsRef.value?.length) return false;

    const isHighlighted = isArrayFieldValueAIBot('components', componentsRef.value);
    if (!isHighlighted) return false;

    const componentsValue = JSON.stringify(componentsRef.value);
    const feedbackNotSubmitted = !componentsFeedbackSubmitted.value.has(componentsValue);

    return feedbackNotSubmitted;
  });

  async function handleComponentsFeedback(kind: 'negative' | 'positive', comment = '') {
    if (!componentsRef.value?.length) return;

    const componentsValue = JSON.stringify(componentsRef.value);

    if (componentsFeedbackSubmitted.value.has(componentsValue)) {
      toastStore.addToast({
        title: 'Feedback Already Submitted',
        body: 'You have already provided feedback for these components.',
        css: 'warning',
      });
      return;
    }

    try {
      await service.sendFeedback({
        feature: 'source_component',
        cve_id: flaw.value.cve_id ?? undefined,
        email: userStore.userEmail,
        request_time: `${service.requestDuration.value}ms`,
        actual: componentsValue,
        accept: kind === 'positive',
        ...(comment && { rejection_comment: comment }),
      });

      componentsFeedbackSubmitted.value.add(componentsValue);

      toastStore.addToast({
        title: 'Aegis-AI-Bot Feedback',
        body: kind === 'positive' ? 'Thanks for the positive feedback.' : 'Thanks for the feedback.',
        css: 'info',
      });
    } catch (error: any) {
      const msg = error?.data?.detail ?? error?.response?.data?.detail ?? error?.message ?? 'Failed to submit feedback';
      toastStore.addToast({
        title: 'Feedback Error',
        body: typeof msg === 'string' ? msg : 'Failed to submit feedback',
        css: 'danger',
      });
    }
  }

  function handleThumbsDown() {
    showComponentsFeedbackModal.value = true;
  }

  function handleFeedbackSubmit(comment: string) {
    showComponentsFeedbackModal.value = false;
    handleComponentsFeedback('negative', comment);
  }

  function handleFeedbackCancel() {
    showComponentsFeedbackModal.value = false;
  }

  return {
    canShowComponentsFeedback,
    showComponentsFeedbackModal,
    handleComponentsFeedback,
    handleThumbsDown,
    handleFeedbackSubmit,
    handleFeedbackCancel,
  };
}
