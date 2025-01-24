import { describe, it, expect, vi } from 'vitest';
import { Settings } from 'luxon';

import IssueQueueItem from '@/components/IssueQueue/IssueQueueItem.vue';
import IssueQueue from '@/components/IssueQueue/IssueQueue.vue';

import { mountWithConfig } from '@/__tests__/helpers';
import LabelCheckbox from '@/widgets/LabelCheckbox/LabelCheckbox.vue';
import type { ZodFlawType } from '@/types';

vi.mock('@/stores/UserStore', () => ({
  useUserStore: () => ({
    jiraUsername: 'skynet',
  }),
}));

describe('issueQueue', () => {
  const mockData: Partial<ZodFlawType>[] = [
    {
      uuid: '709e9ea1-ed0f-49b8-a7ad-9164d4034849',
      cve_id: 'CVE-2903-0092',
      impact: 'MODERATE',
      title: 'title',
      unembargo_dt: '2024-02-01T00:00:00Z',
      source: 'XEN',
      embargoed: false,
      created_dt: '2021-07-29T14:50:50Z',
      updated_dt: '2024-03-15T08:53:06Z',
      classification: {
        workflow: 'DEFAULT',
        state: 'NEW',
      },
      owner: 'test@redhat.com',
    },
  ];

  const mountIssueQueue = (props?: Partial<InstanceType<typeof IssueQueue>['$props']>) => mountWithConfig(IssueQueue, {
    props: {
      issues: mockData,
      isLoading: false,
      isFinalPageFetched: false,
      total: 10,
      ...props,
    },
  });

  afterAll(() => {
    vi.clearAllMocks();
    Settings.defaultZone = 'local';
  });

  it('should fetch data from API', async () => {
    const wrapper = mountIssueQueue();

    const fetchEvents = wrapper.emitted();
    const issues = wrapper.findAllComponents(IssueQueueItem);

    expect(fetchEvents).toHaveProperty('flaws:fetch');
    expect(fetchEvents['flaws:fetch']).toEqual([
      [
        expect.objectContaining({
          _value: { order: '-created_dt' },
        }),
      ],
    ]);
    expect(issues.length).toBe(1);
  });

  it('fetch data from API with specified parameters on MyFlaws', async () => {
    const wrapper = mountIssueQueue();

    const myIssuesCheckbox = wrapper.findAllComponents(LabelCheckbox)[0];
    const myIssuesCheckboxEl = myIssuesCheckbox.find('input[type="checkbox"]');
    await myIssuesCheckboxEl.setValue(true);
    await wrapper.vm.$nextTick();

    const fetchEvents = wrapper.emitted();
    const issues = wrapper.findAllComponents(IssueQueueItem);

    expect(fetchEvents).toHaveProperty('flaws:fetch');
    expect(fetchEvents['flaws:fetch'][0]).toEqual([
      expect.objectContaining({
        _value: { order: '-created_dt', owner: 'skynet' },
      }),
    ]);
    expect(issues.length).toBe(1);
  });

  it('fetch data from API with specified parameters on OpenFlaws', async () => {
    const wrapper = mountIssueQueue({ issues: [] });

    const openIssuesCheckox = wrapper.findAllComponents(LabelCheckbox)[1];
    const openIssuesCheckboxEl = openIssuesCheckox.find('input[type="checkbox"]');
    await openIssuesCheckboxEl.setValue(true);
    await wrapper.vm.$nextTick();

    const fetchEvents = wrapper.emitted();
    const issues = wrapper.findAllComponents(IssueQueueItem);
    expect(fetchEvents).toHaveProperty('flaws:fetch');
    expect(fetchEvents['flaws:fetch'][0]).toEqual([
      expect.objectContaining({
        _value: { order: '-created_dt', workflow_state: 'NEW,TRIAGE,PRE_SECONDARY_ASSESSMENT,SECONDARY_ASSESSMENT' },
      }),
    ]);
    expect(issues.length).toBe(0);
  });

  it('fetch data from API with specified parameters on sort', async () => {
    const wrapper = mountIssueQueue();

    await wrapper.findAll('th').at(0)!.trigger('click');
    const fetchEvents = wrapper.emitted();

    expect(fetchEvents).toHaveProperty('flaws:fetch');
    expect(fetchEvents['flaws:fetch'][0]).toEqual([
      expect.objectContaining({
        _value: { order: '-cve_id,-uuid' },
      }),
    ]);
  });

  it('changes sort order on click', async () => {
    const wrapper = mountIssueQueue();

    await wrapper.findAll('th').at(0)!.trigger('click');
    await wrapper.findAll('th').at(0)!.trigger('click');
    const fetchEvents = wrapper.emitted();

    expect(fetchEvents).toHaveProperty('flaws:fetch');
    expect(fetchEvents['flaws:fetch'][0]).toEqual([
      expect.objectContaining({
        _value: { order: 'cve_id,uuid' },
      }),
    ]);
  });

  it('removes sort order on third click', async () => {
    const wrapper = mountIssueQueue();

    await wrapper.findAll('th').at(0)!.trigger('click');
    await wrapper.findAll('th').at(0)!.trigger('click');
    await wrapper.findAll('th').at(0)!.trigger('click');
    const fetchEvents = wrapper.emitted();

    expect(fetchEvents).toHaveProperty('flaws:fetch');
    expect(fetchEvents['flaws:fetch'][0]).toEqual([
      expect.objectContaining({
        _value: {},
      }),
    ]);
  });

  it('shouldn\'t render total count when no issues', async () => {
    const wrapper = mountIssueQueue({ issues: [] });

    const filterEl = wrapper.find('div.osim-incident-filter');
    expect(filterEl.exists()).toBeTruthy();
    const countEL = filterEl.find('span.float-end');
    expect(countEL.exists()).toBeFalsy();
  });

  it('should render total count', async () => {
    const wrapper = mountIssueQueue({
      issues: Array.from({ length: 50 }).fill(mockData[0]) as ZodFlawType[],
      total: 100,
    });
    const filterEl = wrapper.find('div.osim-incident-filter');
    expect(filterEl.exists()).toBeTruthy();
    const countEL = filterEl.find('span.float-end');
    expect(countEL.exists()).toBeTruthy();
    expect(countEL.text()).toBe('Loaded 50 of 100');
  });

  it('should render loader when loading flaws', async () => {
    const wrapper = mountIssueQueue({
      issues: Array.from({ length: 50 }).fill(mockData[0]) as ZodFlawType[],
      isLoading: true,
      total: 100,
    });
    const filterEl = wrapper.find('div.osim-incident-filter');
    expect(filterEl.exists()).toBeTruthy();
    const spinner = filterEl.find('div.float-end span.spinner-border');
    expect(spinner.exists()).toBeTruthy();
  });

  it('should render create_dt in UTC format', async () => {
    Settings.defaultZone = 'Europe/Madrid';
    const wrapper = mountIssueQueue({
      issues: [{ ...mockData[0], created_dt: '2021-07-29T22:50:50Z' } as ZodFlawType],
    });

    const dateEl = wrapper.findAll('td')[2];
    expect(dateEl.exists()).toBeTruthy();
    expect(dateEl.text()).toBe('2021-07-29');
  });

  it('should render flaw labels', () => {
    const wrapper = mountIssueQueue({
      issues: [{
        ...mockData[0],
        labels: [
          { label: 'test', state: 'NEW', contributor: '' },
          { label: 'test-2', state: 'NEW', contributor: '' },
          { label: 'test-3', state: 'REQ', contributor: '' },
        ],
      } as ZodFlawType],
    });

    const labels = wrapper.findComponent(IssueQueueItem).findAll('span.badge');

    expect(labels.length).toBe(3);
    expect(labels[0].text()).toBe('test-3');
    expect(wrapper.html()).toMatchSnapshot();
  });

  it('should truncate flaw labels', () => {
    const wrapper = mountIssueQueue({
      issues: [{
        ...mockData[0],
        labels: Array.from({ length: 10 }).map((_, i) => ({ label: `test-${i}`, state: 'NEW', contributor: '' })),
      } as ZodFlawType],
    });

    const labels = wrapper.findComponent(IssueQueueItem).findAll('span.badge');

    expect(labels.length).toBe(4);
    expect(wrapper.html()).toMatchSnapshot();
  });

  it('should toggle flaw labels', async () => {
    const wrapper = mountIssueQueue({
      issues: [{
        ...mockData[0],
        labels: Array.from({ length: 10 }).map((_, i) => ({ label: `test-${i}`, state: 'NEW', contributor: '' })),
      } as ZodFlawType],
    });

    const toggleBtn = wrapper.findComponent(IssueQueueItem).find('i');
    await toggleBtn.trigger('click');

    const labels = wrapper.findComponent(IssueQueueItem).findAll('span.badge');
    expect(labels.length).toBe(10);
  });
});
