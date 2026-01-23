import { computed } from 'vue';

import { describe, it, expect, vi, beforeEach } from 'vitest';

import AegisCweActions from '@/components/Aegis/AegisCweActions.vue';

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
    suggestCvss: vi.fn(),
    suggestImpact: vi.fn(),
    suggestMitigation: vi.fn(),
    suggestStatement: vi.fn(),
  })),
}));

vi.mock('@/services/CweService', () => ({
  getMitreUrl: vi.fn((id: string) => `https://cwe.mitre.org/data/definitions/${id}.html`),
  loadCweData: vi.fn(() => [
    { id: '79', name: 'Cross-site Scripting', isProhibited: false },
    { id: '89', name: 'SQL Injection', isProhibited: false },
  ]),
}));

describe('aegisCweActions', () => {
  beforeEach(() => {
    // @ts-expect-error - osimRuntime is readonly in tests
    osimRuntime.value = {
      ...osimRuntime.value,
      flags: {
        ...osimRuntime.value.flags,
        aiCweSuggestions: true,
      },
    };
    vi.clearAllMocks();
  });

  it('renders correctly', () => {
    const wrapper = mountWithConfig(AegisCweActions, {
      props: {
        modelValue: null,
      },
    });

    expect(wrapper.exists()).toBe(true);
    expect(wrapper.html()).toMatchSnapshot();
  });

  it('uses AegisActions component', () => {
    const wrapper = mountWithConfig(AegisCweActions, {
      props: {
        modelValue: 'CWE-79',
      },
    });

    expect(wrapper.findComponent({ name: 'AegisActions' }).exists()).toBe(true);
  });

  it('exposes isFetchingSuggestion state', () => {
    const wrapper = mountWithConfig(AegisCweActions, {
      props: {
        modelValue: null,
      },
    });

    expect(wrapper.vm.isFetchingSuggestion).toBeDefined();
  });

  it('updates model value when suggestion is selected', async () => {
    const { useAegisSuggestion } = await import('@/composables/aegis/useAegisSuggestion');
    const mockSelectSuggestion = vi.fn();

    vi.mocked(useAegisSuggestion).mockReturnValueOnce({
      allSuggestions: computed(() => ['CWE-79', 'CWE-89']),
      canShowFeedback: computed(() => false),
      canSuggest: computed(() => false),
      currentSuggestion: computed(() => 'CWE-79'),
      details: computed(() => ({
        cvss3_vector: null,
        cwe: ['CWE-79', 'CWE-89'],
        impact: null,
        suggested_mitigation: null,
        suggested_statement: null,
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
      suggestImpact: vi.fn(),
      suggestCvss: vi.fn(),
      suggestStatement: vi.fn(),
      suggestMitigation: vi.fn(),
    });

    const wrapper = mountWithConfig(AegisCweActions, {
      props: {
        modelValue: 'CWE-79',
      },
    });

    const aegisActions = wrapper.findComponent({ name: 'AegisActions' });
    await aegisActions.vm.$emit('selectSuggestion', 1);

    expect(mockSelectSuggestion).toHaveBeenCalledWith(1);
  });
});
