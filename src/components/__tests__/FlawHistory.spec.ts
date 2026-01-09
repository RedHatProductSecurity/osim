import { computed, ref, type Directive } from 'vue';

import { mount } from '@vue/test-utils';
import { IMaskDirective } from 'vue-imask';
import * as historyFixtures from '@test-fixtures/sampleFlawHistory.json';

import FlawHistory from '@/components/FlawHistory/FlawHistory.vue';

import type { ZodFlawHistoryItemType } from '@/types/zodFlaw';

import { osimEmptyFlawTest, osimFullFlawTest } from './test-suite-helpers';

describe('flawHistory', () => {
  osimEmptyFlawTest('is not shown if no history present on flaw', async ({ flaw }) => {
    const subject = mount(FlawHistory, {
      props: {
        history: flaw.history,
      },
      global: {
        stubs: {
          EditableDate: true,
        },
      },
    });
    const historyItems = subject.findAll('.alert-info');
    expect(historyItems.length).toBe(0);
  });

  osimFullFlawTest('is shown if history present on flaw', async ({ flaw }) => {
    flaw.history = [];
    flaw.history.push(historyFixtures.regularHistoryItem as ZodFlawHistoryItemType);
    const subject = mount(FlawHistory, {
      props: {
        history: flaw.history,
      },
      global: {
        stubs: {
          EditableDate: true,
        },
      },
    });
    const historyItems = subject.findAll('.alert-info');
    expect(historyItems.length).toBe(1);
    expect(subject.html()).toMatchSnapshot();
  });

  osimFullFlawTest('displays history items', async ({ flaw }) => {
    flaw.history = [];
    flaw.history.push(historyFixtures.regularHistoryItem as ZodFlawHistoryItemType);
    const subject = mount(FlawHistory, {
      props: {
        history: flaw.history,
      },
      global: {
        stubs: {
          EditableDate: true,
        },
      },
    });
    const historyListItem = subject.find('li div');
    expect(historyListItem?.text()).includes('Update Owner:');
  });

  osimFullFlawTest('shows seconds, minutes, hours in timestamp', async ({ flaw }) => {
    flaw.history = [];
    flaw.history.push(historyFixtures.regularHistoryItem as ZodFlawHistoryItemType);
    const subject = mount(FlawHistory, {
      props: {
        history: flaw.history,
      },
      global: {
        stubs: {
          EditableDate: true,
        },
      },
    });
    const historyEntry = subject.find('div.alert-info');
    expect(historyEntry?.text()).includes('15:06:56');
  });

  it('filters history items based on date range', async () => {
    const mockHistory = [{
      pgh_created_at: '2024-10-04T15:00:00.000000Z',
      pgh_slug: 'osidb.FlawAudit:123456',
      pgh_label: 'update',
      pgh_context: { url: 'osidb/api/v1/flaws/12d3820a-a43b-417c-a22e-46e47c232a63', user: 1 },
      pgh_diff: { owner: ['', 'noemail@example.com'] },
    }, {
      pgh_created_at: '2024-10-14T15:08:46.760289Z',
      pgh_slug: 'osidb.FlawAudit:123456',
      pgh_label: 'update',
      pgh_context: { url: 'osidb/api/v1/flaws/12d3820a-a43b-417c-a22e-46e47c232a63', user: 1 },
      pgh_diff: { owner: ['', 'noemail@example.com'] },
    }];

    const props = {
      history: mockHistory,
    };

    const startDate = ref('');
    const endDate = ref('');
    const validDateRange = computed(() => !!startDate.value && !!endDate.value);

    const filteredHistoryItems = computed(() => {
      if (!validDateRange.value) {
        return props.history;
      }

      const start = new Date(startDate.value!);
      const end = new Date(endDate.value!);
      end.setDate(end.getDate() + 1);

      return props.history?.filter((item) => {
        if (!item.pgh_created_at) return false;

        const itemDate = new Date(item.pgh_created_at);

        return itemDate.getTime() >= start.getTime() && itemDate.getTime() <= end.getTime();
      });
    });

    const subject = mount(FlawHistory, {
      props,
      global: {
        provide: {
          startDate,
          endDate,
          validDateRange,
        },
        directives: {
          imask: IMaskDirective as Directive,
        },
      },
    });

    expect(filteredHistoryItems.value).toEqual(mockHistory);

    startDate.value = '2024-10-03';
    endDate.value = '2024-10-04';
    await subject.vm.$nextTick();
    expect(filteredHistoryItems.value.length).toEqual(1);

    startDate.value = '2024-02-01';
    endDate.value = '2024-02-28';
    await subject.vm.$nextTick();
    expect(filteredHistoryItems.value).toEqual([]);
  });

  osimFullFlawTest('displays AI badge for Aegis changes', async ({ flaw }) => {
    flaw.history = [];
    flaw.history.push(historyFixtures.aegisHistoryItem as ZodFlawHistoryItemType);
    const subject = mount(FlawHistory, {
      props: {
        history: flaw.history,
      },
      global: {
        stubs: {
          EditableDate: true,
        },
      },
    });
    const aiBadge = subject.find('.badge');
    expect(aiBadge.exists()).toBe(true);
    expect(aiBadge.text()).toContain('AI');
    expect(aiBadge.find('i.bi-robot').exists()).toBe(true);
  });

  osimFullFlawTest('does not display AI badge for regular changes', async ({ flaw }) => {
    flaw.history = [];
    flaw.history.push(historyFixtures.regularHistoryItem as ZodFlawHistoryItemType);
    const subject = mount(FlawHistory, {
      props: {
        history: flaw.history,
      },
      global: {
        stubs: {
          EditableDate: true,
        },
      },
    });
    const aiBadge = subject.find('.badge');
    expect(aiBadge.exists()).toBe(false);
  });

  osimFullFlawTest('displays AI badge for statement Aegis changes', async ({ flaw }) => {
    flaw.history = [];
    flaw.history.push(historyFixtures.aegisStatementHistoryItem as ZodFlawHistoryItemType);
    const subject = mount(FlawHistory, {
      props: {
        history: flaw.history,
      },
      global: {
        stubs: {
          EditableDate: true,
        },
      },
    });
    const aiBadge = subject.find('.badge');
    expect(aiBadge.exists()).toBe(true);
    expect(aiBadge.text()).toContain('AI');
    expect(aiBadge.find('i.bi-robot').exists()).toBe(true);
  });

  osimFullFlawTest('displays Partial AI badge for modified title suggestion', async ({ flaw }) => {
    flaw.history = [];
    flaw.history.push(historyFixtures.aegisTitleHistoryItem as ZodFlawHistoryItemType);
    const subject = mount(FlawHistory, {
      props: {
        history: flaw.history,
      },
      global: {
        stubs: {
          EditableDate: true,
        },
      },
    });
    const aiBadge = subject.find('.badge');
    expect(aiBadge.exists()).toBe(true);
    expect(aiBadge.text()).toContain('Partial AI');
    expect(aiBadge.find('i.bi-robot').exists()).toBe(true);
  });

  osimFullFlawTest('displays correct badge for sequential AI changes (AI then Partial AI)', async ({ flaw }) => {
    // Scenario: User saves AI suggestion, then modifies and saves again
    // Entry 1 should show AI, Entry 2 should show Partial AI
    const aiSaveEntry = {
      pgh_created_at: '2024-10-04T16:00:00.000000Z',
      pgh_slug: 'osidb.FlawAudit:100001',
      pgh_label: 'update',
      pgh_context: { url: 'osidb/api/v1/flaws/test', user: 1 },
      pgh_diff: {
        mitigation: ['', 'AI generated mitigation'],
        aegis_meta: [{}, { mitigation: [{ type: 'AI', timestamp: '2024-10-04T16:00:00.000Z' }] }],
      },
    };

    const partialAiSaveEntry = {
      pgh_created_at: '2024-10-04T17:00:00.000000Z',
      pgh_slug: 'osidb.FlawAudit:100002',
      pgh_label: 'update',
      pgh_context: { url: 'osidb/api/v1/flaws/test', user: 1 },
      pgh_diff: {
        mitigation: ['AI generated mitigation', 'AI mitigation modified by user'],
        aegis_meta: [
          { mitigation: [{ type: 'AI', timestamp: '2024-10-04T16:00:00.000Z' }] },
          { mitigation: [
            { type: 'AI', timestamp: '2024-10-04T16:00:00.000Z' },
            { type: 'Partial AI', timestamp: '2024-10-04T17:00:00.000Z' },
          ] },
        ],
      },
    };

    flaw.history = [aiSaveEntry, partialAiSaveEntry] as ZodFlawHistoryItemType[];

    const subject = mount(FlawHistory, {
      props: { history: flaw.history },
      global: { stubs: { EditableDate: true } },
    });

    const badges = subject.findAll('.badge');
    expect(badges.length).toBe(2);
    expect(badges[0].text()).toContain('AI');
    expect(badges[0].text()).not.toContain('Partial');
    expect(badges[1].text()).toContain('Partial AI');
  });
});
