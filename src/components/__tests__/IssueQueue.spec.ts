import { mount } from '@vue/test-utils';
import { describe, it, expect, vi } from 'vitest';
import router from '@/router';
import { createTestingPinia } from '@pinia/testing';
import IssueQueue from '../IssueQueue.vue';
import IssueQueueItem from '@/components/IssueQueueItem.vue';
import LabelCheckbox from '../widgets/LabelCheckbox.vue';

vi.mock('@vueuse/core', () => ({
  useSessionStorage: vi.fn(() => ({
    value: {
      refresh: 'mocked_refresh_token',
      env: 'mocked_env',
      whoami: {
        email: 'test@example.com',
        username: 'testuser',
      },
    },
  })),
}));

vi.mock('jwt-decode', () => ({
  default: vi.fn(() => ({
    sub: '1234567890',
    name: 'Test User',
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365,
  })),
}));

describe('IssueQueue', () => {
  const mockData = [
    {
      uuid: '709e9ea1-ed0f-49b8-a7ad-9164d4034849',
      cve_id: 'CVE-2903-0092',
      state: 'NEW',
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

  afterAll(() => {
    vi.clearAllMocks();
  });

  it('should fetch data from API', async () => {
    const pinia = createTestingPinia({
      createSpy: vitest.fn,
      stubActions: false,
    });
    const wrapper = mount(IssueQueue, {
      props: {
        issues: mockData,
        isLoading: false,
        isFinalPageFetched: false,
      },
      global: {
        plugins: [pinia, router],
      },
    });

    const fetchEvents = wrapper.emitted('flaws:fetch');
    expect(fetchEvents[0][0]._value).toEqual({});
    const issues = wrapper.findAllComponents(IssueQueueItem);
    expect(issues.length).toBe(1);
  });

  it('fetch data from API with specified parameters on MyFlaws', async () => {
    const pinia = createTestingPinia({
      createSpy: vitest.fn,
      stubActions: false,
    });
    const wrapper = mount(IssueQueue, {
      props: {
        issues: mockData,
        isLoading: false,
        isFinalPageFetched: false,
      },
      global: {
        plugins: [pinia, router],
      },
    });

    const myIssuesCheckbox = wrapper.findAllComponents(LabelCheckbox)[0];
    const myIssuesCheckboxEl = myIssuesCheckbox.find('input[type="checkbox"]');
    await myIssuesCheckboxEl.setValue(true);
    await wrapper.vm.$nextTick();

    const fetchEvents = wrapper.emitted('flaws:fetch');
    expect(fetchEvents[1][0]._value).toEqual({
      owner: 'test@example.com',
    });

    const issues = wrapper.findAllComponents(IssueQueueItem);
    expect(issues.length).toBe(1);
  });

  it('fetch data from API with specified parameters on OpenFlaws', async () => {
    const pinia = createTestingPinia({
      createSpy: vitest.fn,
      stubActions: false,
    });
    const wrapper = mount(IssueQueue, {
      props: {
        issues: [],
        isLoading: false,
        isFinalPageFetched: false,
      },
      global: {
        plugins: [pinia, router],
      },
    });

    const openIssuesCheckox = wrapper.findAllComponents(LabelCheckbox)[1];
    const openIssuesCheckboxEl = openIssuesCheckox.find('input[type="checkbox"]');
    await openIssuesCheckboxEl.setValue(true);
    await wrapper.vm.$nextTick();

    const fetchEvents = wrapper.emitted('flaws:fetch');
    expect(fetchEvents[1][0]._value).toEqual({
      workflow_state: 'NEW,TRIAGE,PRE_SECONDARY_ASSESSMENT,SECONDARY_ASSESSMENT',
    });
    const issues = wrapper.findAllComponents(IssueQueueItem);
    expect(issues.length).toBe(0);
  });
});
