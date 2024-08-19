import { describe, it, expect } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import FlawTrackers from '@/components/FlawTrackers.vue';
import { sampleFlawAffects_1 } from './__fixtures__/sampleFlawAffects';
import { mount } from '@vue/test-utils';


createTestingPinia();

describe('FlawTrackers', () => {
  let subject;

  function mountWithoutTrackers() {
    const flawId = '09e64027-6e5e-47f1-9150-f2536ccf7fd0';
    return mount(FlawTrackers, {
      props: {
        flawId: flawId,
        displayedTrackers: [],
        affectsNotBeingDeleted: [],
        allTrackersCount: 0,
      },
    });
  }

  function mountWithTrackers() {
    const flawId = '09e64027-6e5e-47f1-9150-f2536ccf7fd0';
    const trackers = sampleFlawAffects_1(flawId)
      .flatMap(affect => affect.trackers.map(tracker => ({ ...tracker, ps_module: affect.ps_module })));
    return mount(FlawTrackers, {
      props: {
        flawId: flawId,
        displayedTrackers: trackers,
        affectsNotBeingDeleted: sampleFlawAffects_1(flawId),
        allTrackersCount: trackers.length,
      },
    });
  }

  it('Correctly renders the component when there are not trackers to display', async () => {
    subject = mountWithoutTrackers();
    expect(subject.html()).toMatchSnapshot();
  });

  it('Correctly renders the component when there are trackers to display', async () => {
    subject = mountWithTrackers();
    expect(subject.html()).toMatchSnapshot();
  });

  it('Per page setting correctly changes the table page items number', async () => {
    subject = mountWithTrackers();

    let trackersTableRows = subject.findAll('.affects-trackers .osim-tracker-card table tbody tr');
    let rowCount = trackersTableRows.length;
    expect(rowCount).toBe(10);
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
    expect(rowCount).toBe(10);
    itemsPerPageIndicator = subject.find('.trackers-toolbar .tracker-badges .btn span');
    expect(itemsPerPageIndicator.text()).toBe('Per page: 10');
  });

  it('Trackers can be sorted by clicking on the date field columns', async () => {
    subject = mountWithTrackers();

    let trackersTableRows = subject.findAll('.affects-trackers .osim-tracker-card table tbody tr');
    let firstTracker = trackersTableRows[0];
    expect(firstTracker.find('td:nth-of-type(2)').text()).toBe('xxxx-0-006');

    const componentHeader = subject.find('.affects-trackers table thead tr th:nth-of-type(6)');
    expect(componentHeader.exists()).toBe(true);
    expect(componentHeader.text()).toBe('Created date');
    await componentHeader.trigger('click');

    trackersTableRows = subject.findAll('.affects-trackers .osim-tracker-card table tbody tr');
    firstTracker = trackersTableRows[0];
    expect(firstTracker.find('td:nth-of-type(2)').text()).toBe('xxxx-0-001');
  });

  it('Displays embedded trackers manager', async () => {
    subject = mountWithTrackers();

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
