import { computed } from 'vue';

import { describe, it, expect, vi, beforeEach } from 'vitest';

import AegisCvssActions from '@/components/Aegis/AegisCvssActions.vue';

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

describe('aegisCvssActions', () => {
  beforeEach(() => {
    // @ts-expect-error - osimRuntime is readonly in tests
    osimRuntime.value = {
      ...osimRuntime.value,
      flags: {
        ...osimRuntime.value.flags,
        aiCvssSuggestions: true,
      },
    };
    vi.clearAllMocks();
  });

  it('renders correctly', () => {
    const wrapper = mountWithConfig(AegisCvssActions, {
      props: {
        modelValue: null,
      },
    });

    expect(wrapper.exists()).toBe(true);
    expect(wrapper.html()).toMatchSnapshot();
  });

  it('uses AegisActions component', () => {
    const wrapper = mountWithConfig(AegisCvssActions, {
      props: {
        modelValue: '',
      },
    });

    expect(wrapper.findComponent({ name: 'AegisActions' }).exists()).toBe(true);
  });

  it('exposes isFetchingSuggestion state', () => {
    const wrapper = mountWithConfig(AegisCvssActions, {
      props: {
        modelValue: null,
      },
    });

    expect(wrapper.vm.isFetchingSuggestion).toBeDefined();
  });

  it('updates model value when suggestion is selected', async () => {
    const { useAegisSuggestion } = await import('@/composables/aegis/useAegisSuggestion');
    const mockSelectSuggestion = vi.fn();

    const suggestedCvss = 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:L';
    vi.mocked(useAegisSuggestion).mockReturnValueOnce({
      allSuggestions: computed(() => [suggestedCvss]),
      canShowFeedback: computed(() => false),
      canSuggest: computed(() => false),
      currentSuggestion: computed(() => suggestedCvss),
      details: computed(() => ({ cvss3_vector: suggestedCvss, cwe: null, impact: null })),
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
    });

    const wrapper = mountWithConfig(AegisCvssActions, {
      props: {
        modelValue: '',
      },
    });

    const aegisActions = wrapper.findComponent({ name: 'AegisActions' });
    await aegisActions.vm.$emit('selectSuggestion', 1);

    expect(mockSelectSuggestion).toHaveBeenCalledWith(1);
  });
});
