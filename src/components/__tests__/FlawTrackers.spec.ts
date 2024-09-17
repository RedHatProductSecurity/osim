import { describe, expect } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { mount } from '@vue/test-utils';

import FlawTrackers from '@/components/FlawTrackers.vue';

import { osimFullFlawTest, osimRequiredFlawTest } from './test-suite-helpers';

createTestingPinia();
vi.mock('@/composables/useTrackers', () => ({
  useTrackers: vi.fn().mockReturnValue({
    trackersToFile: [],
  }),
}));

describe('flawTrackers', () => {
  let subject;

  osimRequiredFlawTest('Correctly renders the component when there are not trackers to display', async ({ flaw }) => {
    subject = mount(FlawTrackers, {
      props: {
        flawId: flaw.uuid,
        displayedTrackers: [],
        affectsNotBeingDeleted: [],
        allTrackersCount: 0,
      },
    });
    expect(subject.html()).toMatchSnapshot();
  });

  osimFullFlawTest('Correctly renders the component when there are trackers to display', async ({ flaw }) => {
    subject = mount(FlawTrackers, {
      props: {
        flawId: flaw.uuid,
        displayedTrackers: flaw.affects
          .flatMap(affect => affect.trackers
            .map(tracker => ({ ...tracker, ps_module: affect.ps_module })),
          ),
        affectsNotBeingDeleted: [],
        allTrackersCount: 0,
      },
    });
    expect(subject.html()).toMatchSnapshot();
  });

  osimFullFlawTest('Per page setting correctly changes the table page items number', async ({ flaw }) => {
    subject = mount(FlawTrackers, {
      props: {
        flawId: flaw.uuid,
        displayedTrackers: flaw.affects
          .flatMap(affect => affect.trackers
            .map(tracker => ({ ...tracker, ps_module: affect.ps_module })),
          ),
        affectsNotBeingDeleted: [],
        allTrackersCount: 0,
      },
    });

    let trackersTableRows = subject.findAll('.affects-trackers .osim-tracker-card table tbody tr');
    let rowCount = trackersTableRows.length;
    expect(rowCount).toBe(6);
    let itemsPerPageIndicator = subject.find('.trackers-toolbar .tracker-badges .btn span');
    expect(itemsPerPageIndicator.text()).toBe('Per page: 10');

    const reduceItemsBtn = subject.find('.trackers-toolbar .tracker-badges .btn .bi-dash-square');
    for (let i = 0; i < 5; i++) {
      await reduceItemsBtn.trigger('click');
    }

    trackersTableRows = subject.findAll('.affects-trackers .osim-tracker-card table tbody tr');
    rowCount = trackersTableRows.length;
    expect(rowCount).toBe(5);
    itemsPerPageIndicator = subject.find('.trackers-toolbar .tracker-badges .btn span');
    expect(itemsPerPageIndicator.text()).toBe('Per page: 5');

    const increaseItemsBtn = subject.find('.trackers-toolbar .tracker-badges .btn .bi-plus-square');
    for (let i = 0; i < 5; i++) {
      await increaseItemsBtn.trigger('click');
    }

    trackersTableRows = subject.findAll('.affects-trackers .osim-tracker-card table tbody tr');
    rowCount = trackersTableRows.length;
    expect(rowCount).toBe(6);
    itemsPerPageIndicator = subject.find('.trackers-toolbar .tracker-badges .btn span');
    expect(itemsPerPageIndicator.text()).toBe('Per page: 10');
  });

  osimFullFlawTest('Trackers can be sorted by clicking on the date field columns', async ({ flaw }) => {
    subject = mount(FlawTrackers, {
      props: {
        flawId: flaw.uuid,
        displayedTrackers: flaw.affects
          .flatMap(affect => affect.trackers
            .map(tracker => ({ ...tracker, ps_module: affect.ps_module })),
          ),
        affectsNotBeingDeleted: [],
        allTrackersCount: 0,
      },
    });

    let trackersTableRows = subject.findAll('.affects-trackers .osim-tracker-card table tbody tr');
    let firstTracker = trackersTableRows[0];
    expect(firstTracker.find('td:nth-of-type(3)').text()).toBe('xxxx-0-006');

    const componentHeader = subject.find('.affects-trackers table thead tr th:nth-of-type(6)');
    expect(componentHeader.exists()).toBe(true);
    expect(componentHeader.text()).toBe('Created date');
    await componentHeader.trigger('click');

    trackersTableRows = subject.findAll('.affects-trackers .osim-tracker-card table tbody tr');
    firstTracker = trackersTableRows[0];
    expect(firstTracker.find('td:nth-of-type(2)').text()).toBe('xxxx-0-001');
  });

  osimFullFlawTest('Displays embedded trackers manager', async ({ flaw }) => {
    subject = mount(FlawTrackers, {
      props: {
        flawId: flaw.uuid,
        displayedTrackers: flaw.affects
          .flatMap(affect => affect.trackers
            .map(tracker => ({ ...tracker, ps_module: affect.ps_module })),
          ),
        affectsNotBeingDeleted: [],
        allTrackersCount: 0,
      },
    });

    let trackerManagerElement = subject.find('.trackers-manager');
    expect(trackerManagerElement.exists()).toBe(false);

    let toggleTrackerManagerView = subject.find('.trackers-toolbar .btn-info');
    expect(toggleTrackerManagerView.text()).toBe('Show Trackers Manager');
    await toggleTrackerManagerView.trigger('click');

    trackerManagerElement = subject.find('.trackers-manager');
    expect(trackerManagerElement.exists()).toBe(true);

    toggleTrackerManagerView = subject.find('.trackers-toolbar .btn-info');
    expect(toggleTrackerManagerView.text()).toBe('Hide Trackers Manager');

    expect(subject.html()).toMatchSnapshot();
  });
});
