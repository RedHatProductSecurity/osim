import { describe, it, expect, beforeEach } from 'vitest';

import AegisActions from '@/components/Aegis/AegisActions.vue';

import { useFlaw } from '@/composables/useFlaw';

import { mountWithConfig } from '@/__tests__/helpers';
import { osimRuntime } from '@/stores/osimRuntime';

const warningSelector = '[role="button"][aria-label="AI-Bot suggestion unavailable"]';

const feedbackProps = {
  canShowFeedback: true,
  canSuggest: false,
  hasAppliedSuggestion: true,
  hasMultipleSuggestions: false,
  isFetchingSuggestion: false,
  selectedIndex: 0,
  suggestions: ['CWE-79'],
  tooltipText: 'AI Suggestions',
};

describe('aegisActions', () => {
  beforeEach(() => {
    useFlaw().resetFlaw();
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
      props: feedbackProps,
    });

    expect(wrapper.find('.bi-arrow-counterclockwise').exists()).toBe(true);
    expect(wrapper.find('.bi-hand-thumbs-up').exists()).toBe(true);
    expect(wrapper.find('.bi-hand-thumbs-down').exists()).toBe(true);
  });

  it('emits feedback events', async () => {
    const wrapper = mountWithConfig(AegisActions, {
      props: feedbackProps,
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

  it('shows skip details without enabling suggestion actions', async () => {
    const wrapper = mountWithConfig(AegisActions, {
      props: {
        ...feedbackProps,
        canShowFeedback: false,
        hasAppliedSuggestion: false,
        skipTooltipText: 'Suggestion unavailable\nReason: confidence below threshold\nDiscarded suggestion: CWE-89',
      },
    });

    const warning = wrapper.get(warningSelector);
    expect(warning.attributes('tabindex')).toBe('0');
    expect(warning.attributes('aria-describedby')).toBeUndefined();
    expect(wrapper.find('.bi-info-circle').exists()).toBe(false);
    expect(wrapper.find('.aegis-tooltip').exists()).toBe(false);
    expect(wrapper.find('.bi-arrow-counterclockwise').exists()).toBe(false);
    expect(wrapper.find('.bi-hand-thumbs-up').exists()).toBe(false);

    await warning.trigger('click');

    const tooltip = wrapper.get('.aegis-tooltip');
    expect(tooltip.text()).toContain('Reason: confidence below threshold');
    expect(tooltip.text()).toContain('Discarded suggestion: CWE-89');
    expect(tooltip.findAll('br')).toHaveLength(2);
    expect(tooltip.attributes('id')).toBeTruthy();
    expect(warning.attributes('aria-describedby')).toBe(tooltip.attributes('id'));
    expect(wrapper.emitted('suggest')).toBeUndefined();
    expect(wrapper.emitted('feedback')).toBeUndefined();
    expect(wrapper.emitted('selectSuggestion')).toBeUndefined();
    expect(wrapper.emitted('revert')).toBeUndefined();
    await warning.trigger('click');
    expect(wrapper.find('.aegis-tooltip').exists()).toBe(false);
    expect(warning.attributes('aria-describedby')).toBeUndefined();
  });

  it('opens from a click on a decorative warning icon', async () => {
    const wrapper = mountWithConfig(AegisActions, {
      props: {
        ...feedbackProps,
        canShowFeedback: false,
        hasAppliedSuggestion: false,
        skipTooltipText: 'Reason: confidence below threshold\nDiscarded suggestion: CWE-89',
      },
    });
    const warning = wrapper.get(warningSelector);
    const icon = warning.get(':scope > i');
    expect(icon.attributes('aria-hidden')).toBe('true');
    await icon.trigger('click');
    expect(wrapper.get('.aegis-tooltip').text()).toContain('Discarded suggestion: CWE-89');
    expect(wrapper.emitted('suggest')).toBeUndefined();
    expect(wrapper.emitted('selectSuggestion')).toBeUndefined();
  });

  it('renders recorded reasons, discarded values and tool names literally instead of interpreting markup', async () => {
    const reason = '<img src=x onerror="alert(1)"> & <script>alert(2)</script>';
    const suggestion = '<b title="untrusted">use \'safe\' & literal &lt;img&gt;</b><br>';
    const tool = '<a href="javascript:alert(3)">tool</a>';
    const wrapper = mountWithConfig(AegisActions, {
      props: {
        ...feedbackProps,
        canShowFeedback: false,
        hasAppliedSuggestion: false,
        skipTooltipText: [
          'Suggestion unavailable',
          `Reason: ${reason}`,
          `Discarded suggestion: ${suggestion}`,
          `Tools used: ${tool}`,
        ].join('\n'),
      },
    });
    await wrapper.get(warningSelector).trigger('click');
    const tooltip = wrapper.get('.aegis-tooltip');
    expect(tooltip.text()).toContain(reason);
    expect(tooltip.text()).toContain(`Discarded suggestion: ${suggestion}`);
    expect(tooltip.text()).toContain(tool);
    expect(tooltip.find('img, script, a, b').exists()).toBe(false);
    expect(tooltip.findAll('br')).toHaveLength(3);
    await wrapper.get(warningSelector).trigger('click');
    expect(wrapper.find('.aegis-tooltip').exists()).toBe(false);
  });

  it('replaces a historical warning with normal suggestion details when a manual suggestion is applied', async () => {
    const wrapper = mountWithConfig(AegisActions, {
      props: {
        ...feedbackProps,
        hasAppliedSuggestion: false,
        skipTooltipText: 'Historical skip reason\nDiscarded suggestion: CWE-89',
        tooltipText: 'Generated by Aegis-AI\nExplanation: New manual suggestion',
      },
    });
    await wrapper.get(warningSelector).trigger('click');
    expect(wrapper.get('.aegis-tooltip').text()).toContain('Historical skip reason');
    await wrapper.setProps({ hasAppliedSuggestion: true });
    expect(wrapper.find(warningSelector).exists()).toBe(false);
    expect(wrapper.get('.bi-info-circle').attributes('aria-label')).toContain('suggestion details');
    expect(wrapper.get('.aegis-tooltip').text()).toContain('New manual suggestion');
    expect(wrapper.get('.aegis-tooltip').text()).not.toContain('Historical skip reason');
    expect(wrapper.get('.aegis-tooltip').text()).not.toContain('Discarded suggestion:');
    expect(wrapper.get('.aegis-tooltip').text()).not.toContain('CWE-89');
    await wrapper.get('.bi-hand-thumbs-up').trigger('click');
    expect(wrapper.emitted('feedback')).toEqual([['positive', '']]);
    await wrapper.get('.bi-arrow-counterclockwise').trigger('click');
    expect(wrapper.emitted('revert')).toHaveLength(1);
  });

  it('keeps generation available alongside a warning when enabled', async () => {
    const wrapper = mountWithConfig(AegisActions, {
      props: {
        ...feedbackProps,
        canShowFeedback: false,
        canSuggest: true,
        hasAppliedSuggestion: false,
        skipTooltipText: 'Suggestion unavailable',
      },
    });
    expect(wrapper.find(warningSelector).exists()).toBe(true);
    await wrapper.get('.bi-stars').trigger('click');
    expect(wrapper.emitted('suggest')).toHaveLength(1);
  });

  it('disables feedback buttons with a tooltip when the flaw is embargoed', async () => {
    useFlaw().flaw.value.embargoed = true;

    const wrapper = mountWithConfig(AegisActions, {
      props: feedbackProps,
    });

    const thumbsUp = wrapper.find('.bi-hand-thumbs-up');
    const thumbsDown = wrapper.find('.bi-hand-thumbs-down');
    const embargoedTooltip = 'Aegis feedback is not allowed on embargoed flaws';

    expect(thumbsUp.classes()).toContain('disabled');
    expect(thumbsDown.classes()).toContain('disabled');
    expect(thumbsUp.attributes('title')).toBe(embargoedTooltip);
    expect(thumbsDown.attributes('title')).toBe(embargoedTooltip);
    expect(thumbsUp.attributes('aria-disabled')).toBe('true');
    expect(thumbsDown.attributes('aria-disabled')).toBe('true');

    await thumbsUp.trigger('click');
    expect(wrapper.emitted('feedback')).toBeUndefined();

    await thumbsDown.trigger('click');
    expect(wrapper.find('.modal').exists()).toBe(false);
  });
});
