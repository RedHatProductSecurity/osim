import { beforeEach, describe, it, expect, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

import FlawComments from '@/components/FlawComments/FlawComments.vue';

import { type ZodFlawCommentType } from '@/types/zodFlaw';
import { searchJiraUsers } from '@/services/JiraService';
import { useSettingsStore } from '@/stores/SettingsStore';
import { mountWithConfig } from '@/__tests__/helpers';
import { CommentType } from '@/constants';

vi.mock('@/services/JiraService', () => ({
  searchJiraUsers: vi.fn(() => Promise.resolve([])),
  jiraTaskUrl: vi.fn((taskKey: string) => `http://jira-backend/browse/${taskKey}`),
  jiraUserUrl: vi.fn(),
}));

describe('flawComments', () => {
  let subject: any;
  const SYSTEM_EMAIL = 'bugzilla@redhat.com';

  beforeEach(() => {
    vi.useFakeTimers();
    subject = mountWithConfig(FlawComments, {
      props: {
        commentsByType: {
          [CommentType.Public]: [],
          [CommentType.Private]: [],
          [CommentType.Internal]: [],
          [CommentType.System]: [],
        } as Record<CommentType, ZodFlawCommentType[]>,
        internalCommentsAvailable: true,
        isLoadingInternalComments: false,
        taskKey: 'sampleKey',
        bugzillaLink: 'sampleBzLink',
        isSaving: false,
      },
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
    vi.useRealTimers();
  });

  it('shows 3 correct tabs on comments section', () => {
    const navLinks = subject.findAll('.nav-link');
    expect(navLinks.length).toBe(4);
    expect(navLinks[0].text()).toBe('Public Comments');
    expect(navLinks[1].text()).toBe('Private Comments');
    expect(navLinks[2].text()).toBe('Internal Comments');
    expect(navLinks[3].text()).toBe('System Comments');
  });

  it('tab navigation changes correctly', async () => {
    const navLinks = subject.findAll('.nav-link');
    // Public comments tab (default)
    let activeTab = subject.find('.nav-link.active');
    expect(activeTab.text()).toContain('Public');
    // Private comments tab
    await navLinks[1].trigger('click');
    activeTab = subject.find('.nav-link.active');
    expect(activeTab.text()).toContain('Private');
    // Internal comments tab
    await navLinks[2].trigger('click');
    activeTab = subject.find('.nav-link.active');
    expect(activeTab.text()).toContain('Internal');
    // System comments tab
    await navLinks[3].trigger('click');
    activeTab = subject.find('.nav-link.active');
    expect(activeTab.text()).toContain('System');
  });

  it('show a functional add comment button', async () => {
    const addCommentButton = subject.find('button');
    expect(addCommentButton.exists()).toBeTruthy();
    expect(addCommentButton.text()).toBe('Add Public Comment');
    // Check that it is functional
    await addCommentButton.trigger('click');
    const newCommentInput = subject.find('textarea');
    expect(newCommentInput.exists()).toBeTruthy();
  });

  it('show message if no comments', () => {
    const commentElements = subject.findAll('ul.comments li');
    expect(commentElements.length).toBe(0);
    const noCommentsMessage = subject.find('.info-message div');
    expect(noCommentsMessage.text()).toBe('No public comments');
  });

  it('correctly display public comments', () => {
    subject = mount(FlawComments, {
      props: {
        commentsByType: {
          [CommentType.Public]: [
            { creator: 'noonerelevant', text: 'First public comment', created_dt: '2023-09-20T14:50:50Z' },
            { creator: 'onelessrelevant', text: 'Second public comment', created_dt: '2021-07-29T14:50:50Z' },
          ] as ZodFlawCommentType[],
          [CommentType.Private]: [],
          [CommentType.Internal]: [],
          [CommentType.System]: [],
        },
        internalCommentsAvailable: false,
        isLoadingInternalComments: false,
        taskKey: 'sampleKey',
        bugzillaLink: 'sampleBzLink',
        isSaving: false,
      },
    });

    const commentElements = subject.findAll('ul.comments li');
    expect(commentElements.length).toBe(2);
    // First public comment checks
    const firstHeader = commentElements[0].find('div');
    const firstBody = commentElements[0].find('p');
    expect(firstHeader.text()).toBe('noonerelevant - 2023-09-20 02:50 PM UTC');
    expect(firstBody.text()).toBe('First public comment');
    // Second public comment checks
    const secondHeader = commentElements[1].findAll('div')[0];
    const secondBody = commentElements[1].findAll('p')[0];
    expect(secondHeader.text()).toBe('onelessrelevant - 2021-07-29 02:50 PM UTC');
    expect(secondBody.text()).toBe('Second public comment');
  });

  it('correctly display private comments', async () => {
    subject = mount(FlawComments, {
      props: {
        commentsByType: {
          [CommentType.Public]: [],
          [CommentType.Private]: [
            { creator: 'noonerelevant', text: 'First private comment', created_dt: '2021-07-29T15:50:50Z' },
            { creator: 'onelessrelevant', text: 'Second private comment', created_dt: '2023-09-20T15:50:50Z' },
          ] as ZodFlawCommentType[],
          [CommentType.Internal]: [],
          [CommentType.System]: [],
        },
        internalCommentsAvailable: false,
        isLoadingInternalComments: false,
        taskKey: 'sampleKey',
        bugzillaLink: 'sampleBzLink',
        isSaving: false,
      },
    });

    const navLinks = subject.findAll('.nav-link');
    await navLinks[1].trigger('click');
    expect(subject.html()).toMatchSnapshot();
  });

  it('show Jira link button', async () => {
    subject = mount(FlawComments, {
      props: {
        commentsByType: {
          [CommentType.Public]: [],
          [CommentType.Private]: [],
          [CommentType.Internal]: [
            { creator: 'noonerelevant', text: 'First internal comment', created_dt: '2023-09-20T16:50:50Z' },
            { creator: 'onelessrelevant', text: 'Second internal comment', created_dt: '2021-07-29T16:50:50Z' },
          ] as ZodFlawCommentType[],
          [CommentType.System]: [],
        },
        internalCommentsAvailable: true,
        isLoadingInternalComments: false,
        taskKey: 'sampleKey',
        bugzillaLink: 'sampleBzLink',
        isSaving: false,
      },
    });
    const jiraLinkBtn = subject.findAll('a')[0];
    expect(jiraLinkBtn.text()).toBe('View in Jira');
    expect(jiraLinkBtn.exists()).toBeTruthy();
  });

  it('correctly display internal comments', async () => {
    subject = mount(FlawComments, {
      props: {
        commentsByType: {
          [CommentType.Public]: [],
          [CommentType.Private]: [],
          [CommentType.Internal]: [
            { creator: 'noonerelevant', text: 'First internal comment', created_dt: '2023-09-20T16:50:50Z' },
            { creator: 'onelessrelevant', text: 'Second internal comment', created_dt: '2021-07-29T16:50:50Z' },
          ] as ZodFlawCommentType[],
          [CommentType.System]: [],
        },
        internalCommentsAvailable: true,
        isLoadingInternalComments: false,
        taskKey: 'sampleKey',
        bugzillaLink: 'sampleBzLink',
        isSaving: false,
      },
    });
    const navLinks = subject.findAll('.nav-link');
    await navLinks[2].trigger('click');
    const commentElements = subject.findAll('ul.comments li');
    expect(commentElements.length).toBe(2);
    // First internal comment checks
    const firstHeader = commentElements[0].findAll('div')[0];
    const firstBody = commentElements[0].findAll('p')[0];
    expect(firstHeader.text()).toBe('noonerelevant - 2023-09-20 04:50 PM UTC');
    expect(firstBody.text()).toBe('First internal comment');
    // Seccond internal comment checks
    const secondHeader = commentElements[1].findAll('div')[0];
    const secondBody = commentElements[1].findAll('p')[0];
    expect(secondHeader.text()).toBe('onelessrelevant - 2021-07-29 04:50 PM UTC');
    expect(secondBody.text()).toBe('Second internal comment');
  });

  it('don\'Show any action button on system comments', async () => {
    const navLinks = subject.findAll('.nav-link');
    await navLinks[3].trigger('click');
    const actionButtons = subject.findAll('.tab-actions > *');
    expect(actionButtons.length).toBe(0);
  });

  it('show message if no system comments', async () => {
    const navLinks = subject.findAll('.nav-link');
    await navLinks[3].trigger('click');
    const commentElements = subject.findAll('ul.comments li');
    expect(commentElements.length).toBe(0);
    const noCommentsMessage = subject.find('.info-message div');
    expect(noCommentsMessage.text()).toBe('No system comments');
  });

  it('correctly display system comments', async () => {
    subject = mount(FlawComments, {
      props: {
        commentsByType: {
          [CommentType.Public]: [],
          [CommentType.Private]: [],
          [CommentType.Internal]: [],
          [CommentType.System]: [
            { creator: SYSTEM_EMAIL, text: 'First system comment', created_dt: '2023-09-20T17:50:50Z' },
            { creator: SYSTEM_EMAIL, text: 'Second system comment', created_dt: '2021-07-29T17:50:50Z' },
          ] as ZodFlawCommentType[],
        },

        internalCommentsAvailable: false,
        isLoadingInternalComments: false,
        taskKey: 'sampleKey',
        bugzillaLink: 'sampleBzLink',
        isSaving: false,
      },
    });

    const navLinks = subject.findAll('.nav-link');
    await navLinks[3].trigger('click');
    const commentElements = subject.findAll('ul.comments li');
    expect(commentElements.length).toBe(2);
    // First system comment checks
    const firstHeader = commentElements[0].findAll('div')[0];
    const firstBody = commentElements[0].findAll('p')[0];
    expect(firstHeader.text()).toBe(`${SYSTEM_EMAIL} - 2023-09-20 05:50 PM UTC`);
    expect(firstBody.text()).toBe('First system comment');
    // Seccond system comment checks
    const secondHeader = commentElements[1].findAll('div')[0];
    const secondBody = commentElements[1].findAll('p')[0];
    expect(secondHeader.text()).toBe(`${SYSTEM_EMAIL} - 2021-07-29 05:50 PM UTC`);
    expect(secondBody.text()).toBe('Second system comment');
  });

  it('should call `searchJiraUsers` on internal comments', async () => {
    vi.mocked(searchJiraUsers, { partial: true }).mockResolvedValueOnce({
      data: {
        users: [{ name: 'test', displayName: 'Test User', avatarUrl: '' }],
      },
    });

    const navLinks = subject.findAll('button');
    await navLinks[2].trigger('click');

    const newCommentInput = subject.find('textarea');
    await newCommentInput.setValue('test @user');

    vi.runAllTimers();
    await flushPromises();

    expect(searchJiraUsers).toHaveBeenCalledWith('user', 'sampleKey');
  });

  it('should not render tabs if unified view is set', async () => {
    const store = useSettingsStore();
    store.settings.unifiedCommentsView = true;
    await flushPromises();

    const tabs = subject.find('.nav-tabs');
    expect(tabs.exists()).toBeFalsy();
  });
});
