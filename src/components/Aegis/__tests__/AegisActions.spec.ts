import { describe, it, expect, beforeEach } from 'vitest';

import AegisActions from '@/components/Aegis/AegisActions.vue';

import { mountWithConfig } from '@/__tests__/helpers';
import { osimRuntime } from '@/stores/osimRuntime';

describe('aegisActions', () => {
  beforeEach(() => {
    // @ts-expect-error - osimRuntime is readonly in tests
    osimRuntime.value = {
      ...osimRuntime.value,
      flags: {
        ...osimRuntime.value.flags,
        aiCweSuggestions: true,
      },
    };
  });

  it('renders correctly', () => {
    const wrapper = mountWithConfig(AegisActions, {
      props: {
        canShowFeedback: false,
        canSuggest: true,
        hasAppliedSuggestion: false,
        hasMultipleSuggestions: false,
        isFetchingSuggestion: false,
        selectedIndex: 0,
        suggestions: [],
        tooltipText: 'Test tooltip',
      },
    });

    expect(wrapper.exists()).toBe(true);
    expect(wrapper.html()).toMatchSnapshot();
  });

  it('emits suggest event when star icon clicked', async () => {
    const wrapper = mountWithConfig(AegisActions, {
      props: {
        canShowFeedback: false,
        canSuggest: true,
        hasAppliedSuggestion: false,
        hasMultipleSuggestions: false,
        isFetchingSuggestion: false,
        selectedIndex: 0,
        suggestions: [],
        tooltipText: 'Suggest CWE',
      },
    });

    await wrapper.find('.bi-stars').trigger('click');
    expect(wrapper.emitted('suggest')).toHaveLength(1);
  });

  it('shows dropdown when multiple suggestions available', () => {
    const wrapper = mountWithConfig(AegisActions, {
      props: {
        canShowFeedback: false,
        canSuggest: true,
        hasAppliedSuggestion: true,
        hasMultipleSuggestions: true,
        isFetchingSuggestion: false,
        selectedIndex: 0,
        suggestions: ['CWE-79', 'CWE-89'],
        tooltipText: 'AI Suggestions',
      },
    });

    expect(wrapper.find('.bi-chevron-down').exists()).toBe(true);
  });

  it('does not show dropdown when only one suggestion', () => {
    const wrapper = mountWithConfig(AegisActions, {
      props: {
        canShowFeedback: false,
        canSuggest: true,
        hasAppliedSuggestion: true,
        hasMultipleSuggestions: false,
        isFetchingSuggestion: false,
        selectedIndex: 0,
        suggestions: ['CWE-79'],
        tooltipText: 'AI Suggestions',
      },
    });

    expect(wrapper.find('.bi-chevron-down').exists()).toBe(false);
  });

  it('shows feedback actions when suggestion applied', () => {
    const wrapper = mountWithConfig(AegisActions, {
      props: {
        canShowFeedback: true,
        canSuggest: false,
        hasAppliedSuggestion: true,
        hasMultipleSuggestions: false,
        isFetchingSuggestion: false,
        selectedIndex: 0,
        suggestions: ['CWE-79'],
        tooltipText: 'AI Suggestions',
      },
    });

    expect(wrapper.find('.bi-arrow-counterclockwise').exists()).toBe(true);
    expect(wrapper.find('.bi-hand-thumbs-up').exists()).toBe(true);
    expect(wrapper.find('.bi-hand-thumbs-down').exists()).toBe(true);
  });

  it('emits feedback events', async () => {
    const wrapper = mountWithConfig(AegisActions, {
      props: {
        canShowFeedback: true,
        canSuggest: false,
        hasAppliedSuggestion: true,
        hasMultipleSuggestions: false,
        isFetchingSuggestion: false,
        selectedIndex: 0,
        suggestions: ['CWE-79'],
        tooltipText: 'AI Suggestions',
      },
    });

    await wrapper.find('.bi-arrow-counterclockwise').trigger('click');
    expect(wrapper.emitted('revert')).toHaveLength(1);

    // Thumbs up emits feedback with positive and empty comment
    await wrapper.find('.bi-hand-thumbs-up').trigger('click');
    expect(wrapper.emitted('feedback')).toHaveLength(1);
    expect(wrapper.emitted('feedback')?.[0]).toEqual(['positive', '']);

    // Thumbs down opens modal instead of directly emitting
    await wrapper.find('.bi-hand-thumbs-down').trigger('click');
    // Modal should now be visible
    expect(wrapper.find('.modal').exists()).toBe(true);

    // Submit feedback via modal
    await wrapper.find('.btn-primary').trigger('click');
    expect(wrapper.emitted('feedback')).toHaveLength(2);
    expect(wrapper.emitted('feedback')?.[1]).toEqual(['negative', '']);
  });

  it('disables suggest icon when canSuggest is false', () => {
    const wrapper = mountWithConfig(AegisActions, {
      props: {
        canShowFeedback: false,
        canSuggest: false,
        hasAppliedSuggestion: false,
        hasMultipleSuggestions: false,
        isFetchingSuggestion: false,
        selectedIndex: 0,
        suggestions: [],
        tooltipText: 'Cannot suggest',
      },
    });

    const starIcon = wrapper.find('.bi-stars');
    expect(starIcon.classes()).toContain('disabled');
  });
});
