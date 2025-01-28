import { describe, expect } from 'vitest';

import FlawTrackers from '@/components/FlawTrackers/FlawTrackers.vue';

import type { ZodFlawType } from '@/types';
import { mountWithConfig } from '@/__tests__/helpers';
import { getNextAccessToken } from '@/services/OsidbAuthService';

import { osimFullFlawTest, osimRequiredFlawTest } from './test-suite-helpers';

vi.mock('@/services/TrackerService', () => ({
  trackerUrl: vi.fn().mockImplementation((trackerType: string, sysId: string) => {
    const trackers: Record<string, string> = { JIRA: 'http://jira-service:8002/browse/' };
    return trackers[trackerType] + sysId;
  }),
}));

vi.mock('@/services/OsidbAuthService');

const mountFlawTrackers = (props: InstanceType<typeof FlawTrackers>['$props']) =>
  mountWithConfig(FlawTrackers, { props });

describe('flawTrackers', () => {
  beforeAll(() => {
    vi.mocked(getNextAccessToken).mockResolvedValue('mocked-access-token');
  });
  osimRequiredFlawTest('Correctly renders the component when there are not trackers to display', async ({ flaw }) => {
    const subject = mountFlawTrackers({
      flaw: flaw as ZodFlawType,
      relatedFlaws: [flaw as ZodFlawType],
      displayedTrackers: [],
      allTrackersCount: 0,
    });
    expect(subject.html()).toMatchSnapshot();
  });

  osimFullFlawTest('Correctly renders the component when there are trackers to display', async ({ flaw }) => {
    const subject = mountFlawTrackers({
      flaw: flaw as ZodFlawType,
      relatedFlaws: [flaw as ZodFlawType],
      displayedTrackers: flaw.affects
        .flatMap(affect => affect.trackers
          .map(tracker => ({ ...tracker, ps_module: affect.ps_module })),
        ),
      allTrackersCount: 0,
    });
    expect(subject.html()).toMatchSnapshot();
  });

  osimFullFlawTest('Per page setting correctly changes the table page items number', async ({ flaw }) => {
    const subject = mountFlawTrackers({
      flaw: flaw as ZodFlawType,
      relatedFlaws: [flaw as ZodFlawType],
      displayedTrackers: flaw.affects
        .flatMap(affect => affect.trackers
          .map(tracker => ({ ...tracker, ps_module: affect.ps_module })),
        ),
      allTrackersCount: 0,
    });

    let trackersTableRows = subject.findAll('.affects-trackers .osim-tracker-card table tbody tr');
    let rowCount = trackersTableRows.length;
    expect(rowCount).toBe(6);
    let itemsPerPageIndicator = subject.find('.trackers-toolbar .tracker-badges .btn span');
    expect(itemsPerPageIndicator.text()).toBe('Per page: 10');

    const reduceItemsBtn = subject.find('.trackers-toolbar .tracker-badges .btn .bi-dash-square');
    await reduceItemsBtn.trigger('click');

    trackersTableRows = subject.findAll('.affects-trackers .osim-tracker-card table tbody tr');
    rowCount = trackersTableRows.length;
    expect(rowCount).toBe(5);
    itemsPerPageIndicator = subject.find('.trackers-toolbar .tracker-badges .btn span');
    expect(itemsPerPageIndicator.text()).toBe('Per page: 5');

    const increaseItemsBtn = subject.find('.trackers-toolbar .tracker-badges .btn .bi-plus-square');
    await increaseItemsBtn.trigger('click');

    trackersTableRows = subject.findAll('.affects-trackers .osim-tracker-card table tbody tr');
    rowCount = trackersTableRows.length;
    expect(rowCount).toBe(6);
    itemsPerPageIndicator = subject.find('.trackers-toolbar .tracker-badges .btn span');
    expect(itemsPerPageIndicator.text()).toBe('Per page: 10');
  });

  osimFullFlawTest('Show all button works properly', async ({ flaw }) => {
    const subject = mountFlawTrackers({
      flaw: flaw as ZodFlawType,
      relatedFlaws: [flaw as ZodFlawType],
      displayedTrackers: flaw.affects
        .flatMap(affect => affect.trackers
          .map(tracker => ({ ...tracker, ps_module: affect.ps_module })),
        ),
      allTrackersCount: 6,
    });

    let badgeButtons = subject.findAll('.tracker-badges div');
    const showAllBtn = badgeButtons[1];
    expect(showAllBtn.text()).toBe('Show All Trackers (6)');

    await showAllBtn.trigger('click');

    const affectsTableRows = subject.findAll('.osim-tracker-card table tbody tr');
    const rowCount = affectsTableRows.length;
    expect(rowCount).toBe(6);
    badgeButtons = subject.findAll('.tracker-badges div');
    expect(badgeButtons.length).toBe(1);
  });

  osimFullFlawTest('Trackers can be sorted by clicking on the date field columns', async ({ flaw }) => {
    const subject = mountFlawTrackers({
      flaw: flaw as ZodFlawType,
      relatedFlaws: [flaw as ZodFlawType],
      displayedTrackers: flaw.affects
        .flatMap(affect => affect.trackers
          .map(tracker => ({ ...tracker, ps_module: affect.ps_module })),
        ),
      allTrackersCount: 0,
    });

    let trackersTableRows = subject.findAll('.affects-trackers .osim-tracker-card table tbody tr');
    let firstTracker = trackersTableRows[0];
    expect(firstTracker.find('td:nth-of-type(4)').text()).toBe('xxxx-0-006');

    const componentHeader = subject.find('.affects-trackers table thead tr th:nth-of-type(7)');
    expect(componentHeader.exists()).toBe(true);
    expect(componentHeader.text()).toBe('Created date');
    await componentHeader.trigger('click');

    trackersTableRows = subject.findAll('.affects-trackers .osim-tracker-card table tbody tr');
    firstTracker = trackersTableRows[0];
    expect(firstTracker.find('td:nth-of-type(4)').text()).toBe('xxxx-0-001');
  });

  osimFullFlawTest('Trackers can be filtered by status', async ({ flaw }) => {
    const subject = mountFlawTrackers({
      flaw: flaw as ZodFlawType,
      relatedFlaws: [flaw as ZodFlawType],
      displayedTrackers: flaw.affects
        .flatMap(affect => affect.trackers
          .map(tracker => ({ ...tracker, ps_module: affect.ps_module })),
        ),
      allTrackersCount: 0,
    });

    let trackersTableRows = subject.findAll('.affects-trackers .osim-tracker-card table tbody tr');
    expect(trackersTableRows.length).toBe(6);

    const trackerStatusFilterBtn = subject.find('#status-filter');
    await trackerStatusFilterBtn.trigger('click');

    const statusFilterSelection = subject.find('ul.dropdown-menu > li > a');
    expect(statusFilterSelection.find('span').text()).toBe('NEW');
    await statusFilterSelection.find('input').trigger('click');

    trackersTableRows = subject.findAll('.affects-trackers .osim-tracker-card table tbody tr');
    expect(trackersTableRows.length).toBe(3);
  });

  osimFullFlawTest('Trackers display functional external links', async ({ flaw }) => {
    const subject = mountFlawTrackers({
      flaw,
      relatedFlaws: [flaw as ZodFlawType],
      displayedTrackers: flaw.affects
        .flatMap(affect => affect.trackers
          .map(tracker => ({ ...tracker, ps_module: affect.ps_module })),
        ),
      allTrackersCount: 0,
    });

    const trackersTableRows = subject.findAll('.affects-trackers .osim-tracker-card table tbody tr');
    const firstTracker = trackersTableRows[0];

    const trackerLink = firstTracker.find('td:nth-child(1) > a');
    expect(trackerLink.attributes('href')).toBe('http://jira-service:8002/browse/XXXX-0006');
  });

  osimFullFlawTest('Tracker modules table cell have correct tooltip', async ({ flaw }) => {
    const subject = mountFlawTrackers({
      flaw,
      relatedFlaws: [flaw as ZodFlawType],
      displayedTrackers: flaw.affects
        .flatMap(affect => affect.trackers
          .map(tracker => ({ ...tracker, ps_module: affect.ps_module })),
        ),
      allTrackersCount: 0,
    });
    const trackerRow = subject.findAll('.affects-trackers .osim-tracker-card table tbody tr')[1];
    const trackerModuleCell = trackerRow.find('td:nth-of-type(2)');
    expect(trackerModuleCell.attributes('title')).toBe('openshift-5');
  });

  osimFullFlawTest('Tracker ps_stream table cell have correct tooltip', async ({ flaw }) => {
    const subject = mountFlawTrackers({
      flaw,
      relatedFlaws: [flaw as ZodFlawType],
      displayedTrackers: flaw.affects
        .flatMap(affect => affect.trackers
          .map(tracker => ({ ...tracker, ps_module: affect.ps_module })),
        ),
      allTrackersCount: 0,
    });
    const trackerRow = subject.findAll('.affects-trackers .osim-tracker-card table tbody tr')[0];
    const trackerModuleCell = trackerRow.find('td:nth-of-type(4)');
    expect(trackerModuleCell.attributes('title')).toBe('xxxx-0-006');
  });

  osimFullFlawTest('Displays embedded trackers manager', async ({ flaw }) => {
    const subject = mountFlawTrackers({
      flaw: flaw as ZodFlawType,
      relatedFlaws: [flaw as ZodFlawType],
      displayedTrackers: flaw.affects
        .flatMap(affect => affect.trackers
          .map(tracker => ({ ...tracker, ps_module: affect.ps_module })),
        ),
      allTrackersCount: 0,
    });

    const trackerManagerElement = subject.find('.osim-tracker-manager');
    expect(trackerManagerElement.exists()).toBe(false);

    const toggleTrackerManagerView = subject.find('.trackers-toolbar .btn-info');
    expect(toggleTrackerManagerView.text()).toBe('Show Trackers Manager');

    // await toggleTrackerManagerView.trigger('click');
    // trackerManagerElement = subject.find('.osim-tracker-manager');
    // expect(trackerManagerElement.exists()).toBe(true);

    // toggleTrackerManagerView = subject.find('.trackers-toolbar .btn-info');
    // expect(toggleTrackerManagerView.text()).toBe('Hide Trackers Manager');

    expect(subject.html()).toMatchSnapshot();
  });
});
