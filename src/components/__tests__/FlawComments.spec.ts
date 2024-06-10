import { beforeEach, describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import FlawComments from '@/components/FlawComments.vue';
import { ref } from 'vue';

createTestingPinia();

vi.mock('@/stores/osimRuntime', async () => {
  const osimRuntimeValue = {
    env: 'unittest',
    backends: {
      osidb: 'http://osidb-backend',
      bugzilla: 'http://bugzilla-backend',
      jira: 'http://jira-backend',
      errata: 'http://errata',
      jiraDisplay: 'http://jira-backend',
    },
    osimVersion: {
      rev: 'osimrev', tag: 'osimtag', timestamp: '1970-01-01T00:00:00Z', dirty: true
    },
    error: '',
  };
  return {
    setup: vi.fn(() => { }),
    osimRuntimeStatus: 1,
    osidbHealth: {
      revision: '',
    },
    osimRuntime: {
      value: osimRuntimeValue,
      ...osimRuntimeValue,
    },
    OsimRuntimeStatus: {
      INIT: 0,
      READY: 1,
      ERROR: 2,
    },
  };
});

vi.mock('@/composables/useInternalComments', () => {
  return {
    useInternalComments: () => ({
      internalComments: ref([
        { author: 'noonerelevant', body: 'First comment', timestamp: '2021-07-29T14:50:50Z' },
        { author: 'onelessrelevant', body: 'Second comment', timestamp: '2023-09-20T14:50:50Z' },
      ]),
      internalCommentsAvailable: vi.fn(() => true),
      loadInternalComments: vi.fn(),
    }),
  };
});

describe('FlawComments', () => {
  let subject: any;
  const SYSTEM_EMAIL = 'bugzilla@redhat.com';

  beforeEach(() => {
    subject = mount(FlawComments, {
      props: {
        comments: [],
        taskKey: 'sampleKey',
        isSaving: false,
      },
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('Shows 3 correct tabs on comments section', () => {
    const navLinks = subject.findAll('.nav-link');
    expect(navLinks.length).toBe(3);
    expect(navLinks[0].text()).toBe('Public Comments');
    expect(navLinks[1].text()).toBe('Internal Comments');
    expect(navLinks[2].text()).toBe('System Comments');
  });

  it('Tab navigation changes correctly', async () => {
    const navLinks = subject.findAll('.nav-link');
    // Public comments tab (default)
    let activeTab = subject.find('.nav-link.active');
    expect(activeTab.text()).toContain('Public');
    // Internal comments tab
    await navLinks[1].trigger('click');
    activeTab = subject.find('.nav-link.active');
    expect(activeTab.text()).toContain('Internal');
    // System comments tab
    await navLinks[2].trigger('click');
    activeTab = subject.find('.nav-link.active');
    expect(activeTab.text()).toContain('System');
  });

  it('Show a functional add comment button', async () => {
    let addCommentButton = subject.find('.tab-actions button');
    expect(addCommentButton.exists()).toBeTruthy();
    expect(addCommentButton.text()).toBe('Add Public Comment');
    // Check that it is functional
    await addCommentButton.trigger('click');
    const newCommentInput = subject.find('.tab-content > div > .osim-input');
    expect(newCommentInput.exists()).toBeTruthy();
    addCommentButton = subject.find('.tab-actions button');
    expect(addCommentButton.exists()).toBeFalsy();
  });

  it('Show message if no comments', () => {
    const commentElements = subject.findAll('ul.comments li');
    expect(commentElements.length).toBe(0);
    const noCommentsMessage = subject.find('ul.comments div');
    expect(noCommentsMessage.text()).toBe('No Public Comments');
  });

  it('Correctly display public comments', () => {
    subject = mount(FlawComments, {
      props: {
        comments: [
          { uuid: 1, creator: 'noonerelevant', text: 'First comment', created_dt: '2021-07-29T14:50:50Z' },
          { uuid: 2, creator: 'onelessrelevant', text: 'Second comment', created_dt: '2023-09-20T14:50:50Z' },
        ],
        taskKey: '',
        isSaving: false,
      },
    });

    const commentElements = subject.findAll('ul.comments li');
    expect(commentElements.length).toBe(2);
    // First public comment checks
    const firstHeader = commentElements[0].findAll('p')[0];
    const firstBody = commentElements[0].findAll('p')[1];
    expect(firstHeader.text()).toContain('noonerelevant - 2021-07-29 04:50 PM');
    expect(firstHeader.text()).toContain('Public');
    expect(firstBody.text()).toBe('First comment');
    // Seccond public comment checks
    const secondHeader = commentElements[1].findAll('p')[0];
    const secondBody = commentElements[1].findAll('p')[1];
    expect(secondHeader.text()).toContain('onelessrelevant - 2023-09-20 04:50 PM');
    expect(secondHeader.text()).toContain('Public');
    expect(secondBody.text()).toBe('Second comment');
  });

  it('Show Jira link button on internal comments', async () => {
    const navLinks = subject.findAll('.nav-link');
    await navLinks[1].trigger('click');
    const actionButtons = subject.findAll('.tab-actions > *');
    expect(actionButtons.length).toBe(2);
    expect(actionButtons[0].text()).toBe('Add Internal Comment');
    expect(actionButtons[1].text()).toContain('Jira');
  });

  it('Correctly display internal comments', async () => {
    const navLinks = subject.findAll('.nav-link');
    await navLinks[1].trigger('click');
    const commentElements = subject.findAll('ul.comments li');
    expect(commentElements.length).toBe(2);
    // First public comment checks
    const firstHeader = commentElements[0].findAll('p')[0];
    const firstBody = commentElements[0].findAll('p')[1];
    expect(firstHeader.text()).toContain('noonerelevant - 2021-07-29 04:50 PM');
    expect(firstHeader.text()).toContain('Internal');
    expect(firstBody.text()).toBe('First comment');
    // Seccond public comment checks
    const secondHeader = commentElements[1].findAll('p')[0];
    const secondBody = commentElements[1].findAll('p')[1];
    expect(secondHeader.text()).toContain('onelessrelevant - 2023-09-20 04:50 PM');
    expect(secondHeader.text()).toContain('Internal');
    expect(secondBody.text()).toBe('Second comment');
  });

  it('Don\'Show any action button on system comments', async () => {
    const navLinks = subject.findAll('.nav-link');
    await navLinks[2].trigger('click');
    const actionButtons = subject.findAll('.tab-actions > *');
    expect(actionButtons.length).toBe(0);
  });

  it('Show message if no system comments', async () => {
    const navLinks = subject.findAll('.nav-link');
    await navLinks[2].trigger('click');
    const commentElements = subject.findAll('ul.comments li');
    expect(commentElements.length).toBe(0);
    const noCommentsMessage = subject.find('ul.comments div');
    expect(noCommentsMessage.text()).toBe('No System Comments');
  });

  it('Correctly display system comments', async () => {
    subject = mount(FlawComments, {
      props: {
        comments: [
          { uuid: 1, creator: SYSTEM_EMAIL, text: 'First comment', created_dt: '2021-07-29T14:50:50Z' },
          { uuid: 2, creator: SYSTEM_EMAIL, text: 'Second comment', created_dt: '2023-09-20T14:50:50Z' },
        ],
        taskKey: 'sampleKey',
        isSaving: false,
      },
    });

    const navLinks = subject.findAll('.nav-link');
    await navLinks[2].trigger('click');
    const commentElements = subject.findAll('ul.comments li');
    expect(commentElements.length).toBe(2);
    // First system comment checks
    const firstHeader = commentElements[0].findAll('p')[0];
    const firstBody = commentElements[0].findAll('p')[1];
    expect(firstHeader.text()).toContain(`${SYSTEM_EMAIL} - 2021-07-29 04:50 PM`);
    expect(firstHeader.text()).toContain('System');
    expect(firstBody.text()).toBe('First comment');
    // Seccond system comment checks
    const secondHeader = commentElements[1].findAll('p')[0];
    const secondBody = commentElements[1].findAll('p')[1];
    expect(secondHeader.text()).toContain(`${SYSTEM_EMAIL} - 2023-09-20 04:50 PM`);
    expect(secondHeader.text()).toContain('System');
    expect(secondBody.text()).toBe('Second comment');
  });
});
