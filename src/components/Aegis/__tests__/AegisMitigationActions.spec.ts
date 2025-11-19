import { computed } from 'vue';

import { describe, it, expect, vi, beforeEach } from 'vitest';

import AegisMitigationActions from '@/components/Aegis/AegisMitigationActions.vue';

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
    suggestCwe: vi.fn(),
  })),
}));

describe('aegisMitigationActions', () => {
  beforeEach(() => {
    // @ts-expect-error - osimRuntime is readonly in tests
    osimRuntime.value = {
      ...osimRuntime.value,
      flags: {
        ...osimRuntime.value.flags,
        aiMitigationSuggestions: true,
      },
    };
    vi.clearAllMocks();
  });

  it('renders correctly', () => {
    const wrapper = mountWithConfig(AegisMitigationActions, {
      props: {
        modelValue: null,
      },
    });

    expect(wrapper.exists()).toBe(true);
    expect(wrapper.html()).toMatchSnapshot();
  });

  it('uses AegisActions component', () => {
    const wrapper = mountWithConfig(AegisMitigationActions, {
      props: {
        modelValue: '',
      },
    });

    expect(wrapper.findComponent({ name: 'AegisActions' }).exists()).toBe(true);
  });

  it('exposes isFetchingSuggestion state', () => {
    const wrapper = mountWithConfig(AegisMitigationActions, {
      props: {
        modelValue: null,
      },
    });

    expect(wrapper.vm.isFetchingSuggestion).toBeDefined();
  });

  it('updates model value when suggestion is selected', async () => {
    const { useAegisSuggestion } = await import('@/composables/aegis/useAegisSuggestion');
    const mockSelectSuggestion = vi.fn();

    const suggestedMitigation = 'Mitigation';
    vi.mocked(useAegisSuggestion).mockReturnValueOnce({
      allSuggestions: computed(() => [suggestedMitigation]),
      canShowFeedback: computed(() => false),
      canSuggest: computed(() => false),
      currentSuggestion: computed(() => suggestedMitigation),
      details: computed(() => ({
        cvss3_vector: null,
        cwe: null,
        impact: null,
        suggested_mitigation: suggestedMitigation,
        suggested_statement: null,
      })),
      hasAppliedSuggestion: computed(() => true),
      hasMultipleSuggestions: computed(() => true),
      isFetchingSuggestion: computed(() => false),
      revert: vi.fn(),
      selectedSuggestionIndex: computed(() => 0),
      selectSuggestion: mockSelectSuggestion,
      sendFeedback: vi.fn(),
      suggestCwe: vi.fn(),
      suggestImpact: vi.fn(),
      suggestCvss: vi.fn(),
      suggestMitigation: vi.fn(),
      suggestStatement: vi.fn(),
    });

    const wrapper = mountWithConfig(AegisMitigationActions, {
      props: {
        modelValue: '',
      },
    });

    const aegisActions = wrapper.findComponent({ name: 'AegisActions' });
    await aegisActions.vm.$emit('selectSuggestion', 1);

    expect(mockSelectSuggestion).toHaveBeenCalledWith(1);
  });
});
