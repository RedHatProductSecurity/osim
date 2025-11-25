import { computed } from 'vue';

import { describe, it, expect, vi, beforeEach } from 'vitest';

import AegisTitleActions from '@/components/Aegis/AegisTitleActions.vue';

import type { UseAegisSuggestDescriptionReturn } from '@/composables/aegis/useAegisSuggestDescription';

import { mountWithConfig } from '@/__tests__/helpers';
import { osimRuntime } from '@/stores/osimRuntime';

const createMockComposable = (overrides = {}): UseAegisSuggestDescriptionReturn => ({
  canShowTitleFeedback: computed(() => false),
  canShowDescriptionFeedback: computed(() => false),
  canSuggest: computed(() => true),
  details: computed(() => null),
  hasAppliedTitleSuggestion: computed(() => false),
  hasAppliedDescriptionSuggestion: computed(() => false),
  isSuggesting: computed(() => false),
  revertTitle: vi.fn(),
  revertDescription: vi.fn(),
  sendTitleFeedback: vi.fn(),
  sendDescriptionFeedback: vi.fn(),
  suggestDescription: vi.fn(),
  ...overrides,
} as UseAegisSuggestDescriptionReturn);

describe('aegisTitleActions', () => {
  beforeEach(() => {
    // @ts-expect-error - osimRuntime is readonly in tests
    osimRuntime.value = {
      ...osimRuntime.value,
      flags: {
        ...osimRuntime.value.flags,
        aiTitleSuggestions: true,
      },
    };
    vi.clearAllMocks();
  });

  it('renders correctly', () => {
    const mockComposable = createMockComposable();
    const wrapper = mountWithConfig(AegisTitleActions, {
      props: {
        composable: mockComposable,
      },
    });

    expect(wrapper.exists()).toBe(true);
    expect(wrapper.html()).toMatchSnapshot();
  });

  it('uses AegisActions component', () => {
    const mockComposable = createMockComposable();
    const wrapper = mountWithConfig(AegisTitleActions, {
      props: {
        composable: mockComposable,
      },
    });

    expect(wrapper.findComponent({ name: 'AegisActions' }).exists()).toBe(true);
  });

  it('exposes isSuggesting state', () => {
    const mockComposable = createMockComposable();
    const wrapper = mountWithConfig(AegisTitleActions, {
      props: {
        composable: mockComposable,
      },
    });

    expect(wrapper.vm.isSuggesting).toBeDefined();
  });

  it('calls suggestDescription when suggest action is triggered', async () => {
    const mockSuggestDescription = vi.fn();
    const mockComposable = createMockComposable({
      suggestDescription: mockSuggestDescription,
    });

    const wrapper = mountWithConfig(AegisTitleActions, {
      props: {
        composable: mockComposable,
      },
    });

    const aegisActions = wrapper.findComponent({ name: 'AegisActions' });
    await aegisActions.vm.$emit('suggest');

    expect(mockSuggestDescription).toHaveBeenCalled();
  });

  it('calls revertTitle when revert action is triggered', async () => {
    const mockRevertTitle = vi.fn();
    const mockComposable = createMockComposable({
      canShowTitleFeedback: computed(() => true),
      revertTitle: mockRevertTitle,
    });

    const wrapper = mountWithConfig(AegisTitleActions, {
      props: {
        composable: mockComposable,
      },
    });

    const aegisActions = wrapper.findComponent({ name: 'AegisActions' });
    await aegisActions.vm.$emit('revert');

    expect(mockRevertTitle).toHaveBeenCalled();
  });

  it('calls sendTitleFeedback when feedback action is triggered', async () => {
    const mockSendTitleFeedback = vi.fn();
    const mockComposable = createMockComposable({
      canShowTitleFeedback: computed(() => true),
      sendTitleFeedback: mockSendTitleFeedback,
    });

    const wrapper = mountWithConfig(AegisTitleActions, {
      props: {
        composable: mockComposable,
      },
    });

    const aegisActions = wrapper.findComponent({ name: 'AegisActions' });
    await aegisActions.vm.$emit('feedback', 'positive');

    expect(mockSendTitleFeedback).toHaveBeenCalledWith('positive');
  });

  it('displays correct tooltip when suggestion is applied', () => {
    const mockComposable = createMockComposable({
      hasAppliedTitleSuggestion: computed(() => true),
      details: computed(() => ({
        suggested_title: 'Test Title',
        confidence: 0.95,
        explanation: 'Test explanation',
        tools_used: ['tool1', 'tool2'],
      })),
    });

    const wrapper = mountWithConfig(AegisTitleActions, {
      props: {
        composable: mockComposable,
      },
    });

    const aegisActions = wrapper.findComponent({ name: 'AegisActions' });
    const tooltip = aegisActions.props('tooltipText');

    expect(tooltip).toContain('Test Title');
    expect(tooltip).toContain('0.95');
    expect(tooltip).toContain('Test explanation');
    expect(tooltip).toContain('tool1, tool2');
  });
});
