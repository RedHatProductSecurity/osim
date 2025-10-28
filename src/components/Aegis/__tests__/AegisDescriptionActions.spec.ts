import { computed } from 'vue';

import { describe, it, expect, vi, beforeEach } from 'vitest';

import AegisDescriptionActions from '@/components/Aegis/AegisDescriptionActions.vue';

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

describe('aegisDescriptionActions', () => {
  beforeEach(() => {
    // @ts-expect-error - osimRuntime is readonly in tests
    osimRuntime.value = {
      ...osimRuntime.value,
      flags: {
        ...osimRuntime.value.flags,
        aiDescriptionSuggestions: true,
      },
    };
    vi.clearAllMocks();
  });

  it('renders correctly', () => {
    const mockComposable = createMockComposable();
    const wrapper = mountWithConfig(AegisDescriptionActions, {
      props: {
        composable: mockComposable,
      },
    });

    expect(wrapper.exists()).toBe(true);
    expect(wrapper.html()).toMatchSnapshot();
  });

  it('uses AegisActions component', () => {
    const mockComposable = createMockComposable();
    const wrapper = mountWithConfig(AegisDescriptionActions, {
      props: {
        composable: mockComposable,
      },
    });

    expect(wrapper.findComponent({ name: 'AegisActions' }).exists()).toBe(true);
  });

  it('exposes isSuggesting state', () => {
    const mockComposable = createMockComposable();
    const wrapper = mountWithConfig(AegisDescriptionActions, {
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

    const wrapper = mountWithConfig(AegisDescriptionActions, {
      props: {
        composable: mockComposable,
      },
    });

    const aegisActions = wrapper.findComponent({ name: 'AegisActions' });
    await aegisActions.vm.$emit('suggest');

    expect(mockSuggestDescription).toHaveBeenCalled();
  });

  it('calls revertDescription when revert action is triggered', async () => {
    const mockRevertDescription = vi.fn();
    const mockComposable = createMockComposable({
      canShowDescriptionFeedback: computed(() => true),
      revertDescription: mockRevertDescription,
    });

    const wrapper = mountWithConfig(AegisDescriptionActions, {
      props: {
        composable: mockComposable,
      },
    });

    const aegisActions = wrapper.findComponent({ name: 'AegisActions' });
    await aegisActions.vm.$emit('revert');

    expect(mockRevertDescription).toHaveBeenCalled();
  });

  it('calls sendDescriptionFeedback when feedback action is triggered', async () => {
    const mockSendDescriptionFeedback = vi.fn();
    const mockComposable = createMockComposable({
      canShowDescriptionFeedback: computed(() => true),
      sendDescriptionFeedback: mockSendDescriptionFeedback,
    });

    const wrapper = mountWithConfig(AegisDescriptionActions, {
      props: {
        composable: mockComposable,
      },
    });

    const aegisActions = wrapper.findComponent({ name: 'AegisActions' });
    await aegisActions.vm.$emit('feedback', 'negative');

    expect(mockSendDescriptionFeedback).toHaveBeenCalledWith('negative');
  });

  it('displays correct tooltip when suggestion is applied', () => {
    const longDescription = 'This is a very long description that will be truncated in the tooltip';
    const mockComposable = createMockComposable({
      hasAppliedDescriptionSuggestion: computed(() => true),
      details: computed(() => ({
        description: longDescription,
        confidence: 0.88,
        explanation: 'Test explanation for description',
        tools_used: ['analyzer', 'parser'],
      })),
    });

    const wrapper = mountWithConfig(AegisDescriptionActions, {
      props: {
        composable: mockComposable,
      },
    });

    const aegisActions = wrapper.findComponent({ name: 'AegisActions' });
    const tooltip = aegisActions.props('tooltipText');

    expect(tooltip).toContain(longDescription.substring(0, 100));
    expect(tooltip).toContain('0.88');
    expect(tooltip).toContain('Test explanation for description');
    expect(tooltip).toContain('analyzer, parser');
  });
});
