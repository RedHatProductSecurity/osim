import { mount } from '@vue/test-utils';

import { osimRuntime } from '@/stores/osimRuntime';
import type { ZodTrackerType } from '@/types';

import TrackerLink from '../TrackerLink.vue';

const mountCell = (props: Record<string, unknown>) => mount(TrackerLink, { props: { tracker: null, ...props } });

describe('trackerLink', () => {
  it('shows a skeleton only while loading', () => {
    const loading = mountCell({ statusLoading: true });
    expect(loading.find('[role="status"] .placeholder').exists()).toBe(true);
    expect(loading.find('[aria-label="Loading tracker status"]').exists()).toBe(true);
    expect(mountCell({}).text()).toBe('');
  });

  it('shows in progress for all nonfailed service statuses and an incomplete OSIDB tracker', () => {
    const wrapper = mountCell({ statusValue: 'In Progress' });
    expect(wrapper.text()).toBe('In Progress');
    expect(wrapper.find('.spinner-border').exists()).toBe(true);
    expect(wrapper.find('.bg-warning-subtle').exists()).toBe(true);
    const incomplete = mountCell({ statusValue: 'In Progress', tracker: { external_system_id: '' } });
    expect(incomplete.text()).toBe('In Progress');
  });

  it('shows service failure with escaped text, focusable pill and no tooltip when reason is empty', () => {
    const wrapper = mountCell({ statusValue: 'Failed', failureReason: '<script>alert(1)</script>' });
    expect(wrapper.find('.bg-danger-subtle').attributes('tabindex')).toBe('0');
    expect(wrapper.find('.bg-danger-subtle').attributes('title')).toBe('<script>alert(1)</script>');
    expect(wrapper.find('.bi-x-circle').exists()).toBe(true);
    expect(wrapper.find('script').exists()).toBe(false);
    for (const failureReason of [null, '', '  ']) {
      const wrapper = mountCell({ statusValue: 'Failed', failureReason });
      expect(wrapper.find('.bg-danger-subtle').attributes('title')).toBeUndefined();
    }
  });

  it('shows a generic tooltip for request failures and lowercase none after an empty result', () => {
    const wrapper = mountCell({ statusValue: 'Failed', statusError: true });
    expect(wrapper.find('.bg-danger-subtle').attributes('title')).toBe('Unable to retrieve tracker creation status.');
    expect(mountCell({ statusValue: 'none' }).text()).toBe('none');
  });

  it.each(['JIRA', 'BUGZILLA'] as const)('preserves %s links despite status failures and loading', (type) => {
    const id = type === 'JIRA' ? 'TEST-42' : '42';
    const tracker = { type, external_system_id: id } as ZodTrackerType;
    const wrapper = mountCell({ tracker, statusValue: 'Failed', statusError: true, statusLoading: true });
    const url = type === 'JIRA'
      ? `${osimRuntime.value.backends.jiraDisplay || 'http://jira-service:8002'}/browse/${id}`
      : `${osimRuntime.value.backends.bugzilla || 'http://bugzilla-service:8001'}/${id}`;
    expect(wrapper.find('a').attributes('href')).toBe(url);
    expect(wrapper.find('a').attributes('target')).toBe('_blank');
    expect(wrapper.find('.bg-danger-subtle').exists()).toBe(false);
  });
});
