import { computed } from 'vue';

import { describe, it, expect, vi, beforeEach } from 'vitest';

import AegisStatementActions from '@/components/Aegis/AegisStatementActions.vue';

import { mountWithConfig } from '@/__tests__/helpers';
import { osimRuntime } from '@/stores/osimRuntime';

vi.mock('@/composables/aegis/useAegisSuggestion', () => ({
  useAegisSuggestion: vi.fn(() => ({
    allSuggestions: computed(() => []),
    canShowFeedback: computed(() => false),
    canSuggest: computed(() => true),
    currentSuggestion: computed(() => null),
    details: computed(() => null),
    hasAppliedSuggestion: computed(() => false),
    hasMultipleSuggestions: computed(() => false),
    isFetchingSuggestion: computed(() => false),
    revert: vi.fn(),
    selectedSuggestionIndex: computed(() => 0),
    selectSuggestion: vi.fn(),
    sendFeedback: vi.fn(),
    suggestMitigation: vi.fn(),
    suggestStatement: vi.fn(),
  })),
}));

describe('aegisStatementActions', () => {
  beforeEach(() => {
    // @ts-expect-error - osimRuntime is readonly in tests
    osimRuntime.value = {
      ...osimRuntime.value,
      flags: {
        ...osimRuntime.value.flags,
        aiStatementSuggestions: true,
      },
    };
    vi.clearAllMocks();
  });

  it('renders correctly', () => {
    const wrapper = mountWithConfig(AegisStatementActions, {
      props: {
        modelValue: null,
      },
    });

    expect(wrapper.exists()).toBe(true);
    expect(wrapper.html()).toMatchSnapshot();
  });

  it('uses AegisActions component', () => {
    const wrapper = mountWithConfig(AegisStatementActions, {
      props: {
        modelValue: '',
      },
    });

    expect(wrapper.findComponent({ name: 'AegisActions' }).exists()).toBe(true);
  });

  it('exposes isFetchingSuggestion state', () => {
    const wrapper = mountWithConfig(AegisStatementActions, {
      props: {
        modelValue: null,
      },
    });

    expect(wrapper.vm.isFetchingSuggestion).toBeDefined();
  });

  it('updates model value when suggestion is selected', async () => {
    const { useAegisSuggestion } = await import('@/composables/aegis/useAegisSuggestion');
    const mockSelectSuggestion = vi.fn();

    const suggestedStatement = 'This is a suggested statement';
    vi.mocked(useAegisSuggestion).mockReturnValueOnce({
      allSuggestions: computed(() => [suggestedStatement]),
      canShowFeedback: computed(() => false),
      canSuggest: computed(() => false),
      currentSuggestion: computed(() => suggestedStatement),
      details: computed(() => ({
        cvss3_vector: null,
        cwe: null,
        impact: null,
        suggested_statement: suggestedStatement,
        suggested_mitigation: null,
      })),
      hasAppliedSuggestion: computed(() => true),
      hasPartialModification: computed(() => false),
      hasMultipleSuggestions: computed(() => true),
      isFetchingSuggestion: computed(() => false),
      revert: vi.fn(),
      selectedSuggestionIndex: computed(() => 0),
      selectSuggestion: mockSelectSuggestion,
      sendFeedback: vi.fn(),
      suggestCwe: vi.fn(),
      suggestCvss: vi.fn(),
      suggestImpact: vi.fn(),
      suggestStatement: vi.fn(),
      suggestMitigation: vi.fn(),
    });

    const wrapper = mountWithConfig(AegisStatementActions, {
      props: {
        modelValue: 'Old statement',
      },
    });

    const aegisActions = wrapper.findComponent({ name: 'AegisActions' });
    await aegisActions.vm.$emit('selectSuggestion', 1);

    expect(mockSelectSuggestion).toHaveBeenCalledWith(1);
  });
});
