import { computed } from 'vue';

import { describe, it, expect, vi, beforeEach } from 'vitest';

import AegisComponentActions from '@/components/Aegis/AegisComponentActions.vue';

import { mountWithConfig } from '@/__tests__/helpers';
import { osimRuntime } from '@/stores/osimRuntime';

vi.mock('@/composables/aegis/useAegisSuggestComponents', () => ({
  useAegisSuggestComponents: vi.fn(() => ({
    allSuggestions: computed(() => []),
    canShowFeedback: computed(() => false),
    canSuggest: computed(() => true),
    details: computed(() => ({ suggested_components: null })),
    hasAppliedSuggestion: computed(() => false),
    hasMultipleSuggestions: computed(() => false),
    isFetchingSuggestion: computed(() => false),
    revert: vi.fn(),
    selectedSuggestionIndex: computed(() => 0),
    selectSuggestion: vi.fn(),
    sendFeedback: vi.fn(),
    suggestComponents: vi.fn(),
  })),
}));

vi.mock('@/composables/aegis/useAegisFieldFeedback', () => ({
  useAegisFieldFeedback: vi.fn(() => ({
    canShowFeedbackExtended: computed(() => false),
    handleFieldFeedback: vi.fn(),
    isFieldAIBot: computed(() => false),
  })),
}));

describe('aegisComponentActions', () => {
  beforeEach(() => {
    // @ts-expect-error - osimRuntime is readonly in tests
    osimRuntime.value = {
      ...osimRuntime.value,
      flags: {
        ...osimRuntime.value.flags,
        aiComponentSuggestions: true,
      },
    };
    vi.clearAllMocks();
  });

  it('renders correctly', () => {
    const wrapper = mountWithConfig(AegisComponentActions, {
      props: {
        modelValue: null,
      },
    });

    expect(wrapper.exists()).toBe(true);
    expect(wrapper.html()).toMatchSnapshot();
  });

  it('uses AegisActions component', () => {
    const wrapper = mountWithConfig(AegisComponentActions, {
      props: {
        modelValue: [],
      },
    });

    expect(wrapper.findComponent({ name: 'AegisActions' }).exists()).toBe(true);
  });

  it('exposes isFetchingSuggestion state', () => {
    const wrapper = mountWithConfig(AegisComponentActions, {
      props: {
        modelValue: null,
      },
    });

    expect(wrapper.vm.isFetchingSuggestion).toBeDefined();
  });

  it('updates model value when suggestion is selected', async () => {
    const { useAegisSuggestComponents } = await import('@/composables/aegis/useAegisSuggestComponents');
    const mockSelectSuggestion = vi.fn();

    const suggestedComponents = ['component1', 'component2'];
    vi.mocked(useAegisSuggestComponents).mockReturnValueOnce({
      allSuggestions: computed(() => [suggestedComponents]),
      canShowFeedback: computed(() => false),
      canSuggest: computed(() => false),
      details: computed(() => ({
        components: suggestedComponents,
        confidence: 0.8,
        explanation: 'AI suggested these components',
        tools_used: ['tool1'],
      })),
      hasAppliedSuggestion: computed(() => true),
      hasMultipleSuggestions: computed(() => false),
      isFetchingSuggestion: computed(() => false),
      revert: vi.fn(),
      selectedSuggestionIndex: computed(() => 0),
      selectSuggestion: mockSelectSuggestion,
      sendFeedback: vi.fn(),
      suggestComponents: vi.fn(),
    });

    const wrapper = mountWithConfig(AegisComponentActions, {
      props: {
        modelValue: [],
      },
    });

    const aegisActions = wrapper.findComponent({ name: 'AegisActions' });
    await aegisActions.vm.$emit('selectSuggestion', 0);

    expect(mockSelectSuggestion).toHaveBeenCalledWith(0);
  });
});
