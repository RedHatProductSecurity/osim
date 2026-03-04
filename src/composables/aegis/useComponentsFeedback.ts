import { computed, ref, type Ref } from 'vue';

import { useAegisMetadataTracking } from '@/composables/aegis/useAegisMetadataTracking';

import { useToastStore } from '@/stores/ToastStore';
import { useUserStore } from '@/stores/UserStore';

export function useComponentsFeedback(componentsRef: Ref<null | string[] | undefined>) {
  const { isFieldValueAIBot } = useAegisMetadataTracking();
  const toastStore = useToastStore();

  const componentsFeedbackSubmitted = ref<Set<string>>(new Set());
  const showComponentsFeedbackModal = ref(false);

  // Helper function to check if an array field was populated by AI-Bot
  const isArrayFieldValueAIBot = (fieldName: string, currentValue: null | string[] | undefined): boolean => {
    if (!currentValue) return false;
    // Since Aegis stores arrays as JSON, we use JSON.stringify for comparison
    return isFieldValueAIBot(fieldName, JSON.stringify(currentValue));
  };

  const canShowComponentsFeedback = computed(() => {
    if (!componentsRef.value?.length) return false;

    const isHighlighted = isArrayFieldValueAIBot('components', componentsRef.value);
    if (!isHighlighted) return false;

    const componentsValue = JSON.stringify(componentsRef.value);
    const feedbackNotSubmitted = !componentsFeedbackSubmitted.value.has(componentsValue);

    return feedbackNotSubmitted;
  });

  function handleComponentsFeedback(kind: 'negative' | 'positive', comment: string = '') {
    if (!componentsRef.value?.length) return;

    const componentsValue = JSON.stringify(componentsRef.value);

    // Mark feedback as submitted
    componentsFeedbackSubmitted.value.add(componentsValue);

    // Show toast notification
    toastStore.addToast({
      title: 'OSIDB-Bot Feedback',
      body: `${kind} feedback submitted for Source Component${comment ? `: ${comment}` : ''}`,
      css: 'success',
    });
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
