import { mount } from '@vue/test-utils';

import FlawHistory from '@/components/FlawHistory.vue';

import type { ZodFlawHistoryItemType } from '@/types/zodFlaw';

import { osimEmptyFlawTest, osimFullFlawTest } from './test-suite-helpers';

function sampleHistoryItem(): ZodFlawHistoryItemType {
  return {
    pgh_created_at: '2024-10-04T12:06:56.760289Z',
    pgh_slug: 'osidb.FlawAudit:123456',
    pgh_label: 'update',
    pgh_context: { url: 'osidb/api/v1/flaws/12d3820a-a43b-417c-a22e-46e47c232a63', user: 1 },
    pgh_diff: { owner: ['', 'noemail@example.com'] },
  };
}

describe('flawHistory', () => {
  osimEmptyFlawTest('is not shown if no history present on flaw', async ({ flaw }) => {
    const subject = mount(FlawHistory, {
      props: {
        flaw: flaw,
      },
    });
    const comp = subject.findComponent(FlawHistory);
    expect(comp?.exists()).toBe(true);
    expect(comp?.isVisible()).toBe(false);
  });

  osimFullFlawTest('is shown if history present on flaw', async ({ flaw }) => {
    flaw.history = [];
    flaw.history.push(sampleHistoryItem());
    const subject = mount(FlawHistory, {
      props: {
        flaw: flaw,
      },
    });
    const comp = subject.findComponent(FlawHistory);
    expect(comp?.exists()).toBe(true);
    expect(comp?.isVisible()).toBe(true);
    expect(subject.html()).toMatchSnapshot();
  });

  osimFullFlawTest('displays history items', async ({ flaw }) => {
    flaw.history = [];
    flaw.history.push(sampleHistoryItem());
    const subject = mount(FlawHistory, {
      props: {
        flaw: flaw,
      },
    });
    const historyListItem = subject.find('li div');
    expect(historyListItem?.text()).includes('Update Owner:');
  });
});
