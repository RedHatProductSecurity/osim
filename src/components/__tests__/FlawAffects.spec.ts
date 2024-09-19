import { describe, expect } from 'vitest';

import FlawAffects from '@/components/FlawAffects.vue';

import { mountWithConfig } from '@/__tests__/helpers';
import type { ZodFlawType } from '@/types/zodFlaw';

import { osimEmptyFlawTest, osimFullFlawTest } from './test-suite-helpers';

const mountFlawAffects = (flaw: ZodFlawType) => mountWithConfig(FlawAffects, {
  props: {
    flawId: flaw.uuid,
    embargoed: flaw.embargoed,
    affects: flaw.affects,
    affectsToDelete: [],
    error: [],
    affectCvssToDelete: {},
  },
});

vi.mock('@/composables/useTrackers', () => ({
  useTrackers: vi.fn().mockReturnValue({
    trackersToFile: [],
    isLoadingTrackers: true,
  }),
}));

vi.mock('@/composables/useTrackers', () => ({
  useTrackers: vi.fn().mockReturnValue({
    trackersToFile: [],
  }),
}));
describe('flawAffects', () => {
  osimEmptyFlawTest('Correctly renders the component when there are not affects to display', async ({ flaw }) => {
    const subject = mountFlawAffects(flaw);

    expect(subject.html()).toMatchSnapshot();
  });

  osimFullFlawTest('Correctly renders the component when there are affects to display', async ({ flaw }) => {
    const subject = mountFlawAffects(flaw);
    expect(subject.html()).toMatchSnapshot();
  });

  osimFullFlawTest('Filter button for module with trackers have correct tootltip', async ({ flaw }) => {
    const subject = mountFlawAffects(flaw);
    const moduleFilterBtn = subject.findAll('.module-btn')[0];
    expect(moduleFilterBtn.attributes('title')).toBe('openshift-1');
  });

  osimFullFlawTest('Filter button for module without trackers have correct tootltip', async ({ flaw }) => {
    const subject = mountFlawAffects(flaw);
    const moduleFilterBtn = subject.findAll('.module-btn')[1];
    expect(moduleFilterBtn.attributes('title')).toBe('openshift-2\nThis module has no trackers associated');
  });

  osimFullFlawTest('Filter tables when affected modules are selected', async ({ flaw }) => {
    const subject = mountFlawAffects(flaw);

    let affectsTableRows = subject.findAll('.affects-management table tbody tr');
    let rowCount = affectsTableRows.length;
    expect(rowCount).toBe(6);

    const moduleBtns = subject.findAll('.module-btn');
    await moduleBtns[0].trigger('click');

    affectsTableRows = subject.findAll('.affects-management table tbody tr');
    rowCount = affectsTableRows.length;
    expect(rowCount).toBe(1);
  });

  osimFullFlawTest('Per page setting correctly changes the table page items number', async ({ flaw }) => {
    const subject = mountFlawAffects(flaw);

    let affectsTableRows = subject.findAll('.affects-management table tbody tr');
    let rowCount = affectsTableRows.length;
    expect(rowCount).toBe(6);
    let itemsPerPageIndicator = subject.find('.affects-toolbar .badges .btn span');
    expect(itemsPerPageIndicator.text()).toBe('Per page: 10');

    const reduceItemsBtn = subject.find('.affects-toolbar .badges .btn .bi-dash-square');
    for (let i = 0; i < 5; i++) {
      await reduceItemsBtn.trigger('click');
    }

    affectsTableRows = subject.findAll('.affects-management table tbody tr');
    rowCount = affectsTableRows.length;
    expect(rowCount).toBe(5);
    itemsPerPageIndicator = subject.find('.affects-toolbar .badges .btn span');
    expect(itemsPerPageIndicator.text()).toBe('Per page: 5');

    const increaseItemsBtn = subject.find('.affects-toolbar .badges .btn .bi-plus-square');
    for (let i = 0; i < 5; i++) {
      await increaseItemsBtn.trigger('click');
    }

    affectsTableRows = subject.findAll('.affects-management table tbody tr');
    rowCount = affectsTableRows.length;
    expect(rowCount).toBe(6); itemsPerPageIndicator = subject.find('.affects-toolbar .badges .btn span');
    expect(itemsPerPageIndicator.text()).toBe('Per page: 10');
  });

  osimFullFlawTest('Affects are selectable by clicking in the row', async ({ flaw }) => {
    const subject = mountFlawAffects(flaw);

    let affectsTableSelectedRows = subject.findAll('.affects-management table tbody tr.selected');
    expect(affectsTableSelectedRows.length).toBe(0);

    const affectsTableRows = subject.findAll('.affects-management table tbody tr');
    await affectsTableRows[0].trigger('click');

    affectsTableSelectedRows = subject.findAll('.affects-management table tbody tr.selected');
    expect(affectsTableSelectedRows.length).toBe(1);
  });

  osimFullFlawTest('Selection actions are displayed on toolbar', async ({ flaw }) => {
    const subject = mountFlawAffects(flaw);

    let tableActions = subject.findAll('.affects-toolbar .affects-table-actions .btn');
    expect(tableActions.length).toBe(1);

    const affectsTableRows = subject.findAll('.affects-management table tbody tr');
    await affectsTableRows[0].trigger('click');
    await affectsTableRows[1].trigger('click');

    tableActions = subject.findAll('.affects-toolbar .affects-table-actions .btn');
    expect(tableActions.length).toBe(4);
  });

  osimFullFlawTest('Affects can be set to edit mode', async ({ flaw }) => {
    const subject = mountFlawAffects(flaw);

    let affectsTableEditingRows = subject.findAll('.affects-management table tbody tr.editing');
    expect(affectsTableEditingRows.length).toBe(0);

    const affectsTableRows = subject.findAll('.affects-management table tbody tr');
    const affectRowEditBtn = affectsTableRows[0].find('td:last-of-type button:first-of-type');
    expect(affectRowEditBtn.exists()).toBe(true);
    await affectRowEditBtn.trigger('click');

    affectsTableEditingRows = subject.findAll('.affects-management table tbody tr.editing');
    expect(affectsTableEditingRows.length).toBe(1);
  });

  osimFullFlawTest('Show DEFER resolution option when affect impact is LOW', async ({ flaw }) => {
    const subject = mountFlawAffects(flaw);

    const affectsTableRows = subject.findAll('.affects-management table tbody tr');
    const affectRowEditBtn = affectsTableRows[0].find('td:last-of-type button:first-of-type');
    expect(affectRowEditBtn.exists()).toBe(true);
    await affectRowEditBtn.trigger('click');

    const affectsTableEditingRows = subject.findAll('.affects-management table tbody tr.editing');
    const affectednessSelect = affectsTableEditingRows[0].find('td:nth-of-type(5) select');
    const resolutionSelect = affectsTableEditingRows[0].find('td:nth-of-type(6) select');
    const impactSelect = affectsTableEditingRows[0].find('td:nth-of-type(7) select');

    const selectedImpact = impactSelect.find('option[selected]');
    expect(selectedImpact.text()).toBe('LOW');

    const selectedAffectedness = affectednessSelect.find('option[selected]');
    expect(selectedAffectedness.text()).toBe('AFFECTED');

    const resolutionOptions = resolutionSelect.findAll('option').map(wrapper => wrapper.text());
    expect(resolutionOptions.length).toBe(4);
    expect(resolutionOptions.includes('DELEGATED')).toBe(true);
  });

  osimFullFlawTest('Don\'t show DEFER resolution option if impact is not LOW', async ({ flaw }) => {
    const subject = mountFlawAffects(flaw);

    const affectsTableRows = subject.findAll('.affects-management table tbody tr');
    const affectRowEditBtn = affectsTableRows[5].find('td:last-of-type button:first-of-type');
    expect(affectRowEditBtn.exists()).toBe(true);
    await affectRowEditBtn.trigger('click');

    const affectsTableEditingRows = subject.findAll('.affects-management table tbody tr.editing');
    const affectednessSelect = affectsTableEditingRows[0].find('td:nth-of-type(5) select');
    const resolutionSelect = affectsTableEditingRows[0].find('td:nth-of-type(6) select');
    const impactSelect = affectsTableEditingRows[0].find('td:nth-of-type(7) select');

    const selectedImpact = impactSelect.find('option[selected]');
    expect(selectedImpact.text()).toBe('CRITICAL');

    const selectedAffectedness = affectednessSelect.find('option[selected]');
    expect(selectedAffectedness.text()).toBe('');

    const resolutionOptions = resolutionSelect.findAll('option').map(wrapper => wrapper.text());
    expect(resolutionOptions.includes('DEFER')).toBe(false);
  });

  osimFullFlawTest('Affects can be modified', async ({ flaw }) => {
    const subject = mountFlawAffects(flaw);

    let affectsTableEditingRows = subject.findAll('.affects-management table tbody tr.modified');
    expect(affectsTableEditingRows.length).toBe(0);

    const affectsTableRows = subject.findAll('.affects-management table tbody tr');
    const affectRowEditBtn = affectsTableRows[0].find('td:last-of-type button:first-of-type');
    expect(affectRowEditBtn.exists()).toBe(true);
    await affectRowEditBtn.trigger('click');

    affectsTableEditingRows = subject.findAll('.affects-management table tbody tr.editing');
    expect(affectsTableEditingRows.length).toBe(1);

    const componentInput = affectsTableEditingRows[0].find('td:nth-of-type(3) input');
    componentInput.setValue(componentInput.text() + '-test');

    const affectRowCommitBtn = affectsTableEditingRows[0].find('td:last-of-type button:first-of-type');
    expect(affectRowCommitBtn.exists()).toBe(true);
    await affectRowCommitBtn.trigger('click');

    const affectsTableModifiedRows = subject.findAll('.affects-management table tbody tr.modified');
    expect(affectsTableModifiedRows.length).toBe(1);
  });

  osimFullFlawTest('Affect changes can be discarded', async ({ flaw }) => {
    const subject = mountFlawAffects(flaw);

    let affectsTableEditingRows = subject.findAll('.affects-management table tbody tr.modified');
    expect(affectsTableEditingRows.length).toBe(0);

    const affectsTableRows = subject.findAll('.affects-management table tbody tr');
    const affectRowEditBtn = affectsTableRows[0].find('td:last-of-type button:first-of-type');
    expect(affectRowEditBtn.exists()).toBe(true);
    await affectRowEditBtn.trigger('click');

    affectsTableEditingRows = subject.findAll('.affects-management table tbody tr.editing');
    expect(affectsTableEditingRows.length).toBe(1);

    const componentInput = affectsTableEditingRows[0].find('td:nth-of-type(3) input');
    componentInput.setValue(componentInput.text() + '-test');

    const affectRowDiscardBtn = affectsTableEditingRows[0].find('td:last-of-type button:nth-of-type(2)');
    expect(affectRowDiscardBtn.exists()).toBe(true);
    await affectRowDiscardBtn.trigger('click');

    const affectsTableModifiedRows = subject.findAll('.affects-management table tbody tr.modified');
    expect(affectsTableModifiedRows.length).toBe(0);
  });

  osimFullFlawTest('Toolbar state badges can be activate to filter affects', async ({ flaw }) => {
    const subject = mountFlawAffects(flaw);

    let badgeBtns = subject.findAll('.affects-toolbar .badges .badge-btn');
    expect(badgeBtns.length).toBe(1);

    let affectsTableRows = subject.findAll('.affects-management table tbody tr');
    expect(affectsTableRows.length).toBe(6);

    const affectRowEditBtn = affectsTableRows[0].find('td:last-of-type  button:first-of-type');
    expect(affectRowEditBtn.find('i.bi-pencil').exists()).toBe(true);
    await affectRowEditBtn.trigger('click');

    badgeBtns = subject.findAll('.affects-toolbar .badges .badge-btn');
    expect(badgeBtns.length).toBe(2);
    await badgeBtns[1].trigger('click');

    affectsTableRows = subject.findAll('.affects-management table tbody tr');
    expect(affectsTableRows.length).toBe(1);

    await badgeBtns[0].trigger('click');
    affectsTableRows = subject.findAll('.affects-management table tbody tr');
    expect(affectsTableRows.length).toBe(6);
  });

  osimFullFlawTest('Affects can be sorted by clicking on the field column', async ({ flaw }) => {
    const subject = mountFlawAffects(flaw);

    let affectsTableRows = subject.findAll('.affects-management table tbody tr');
    let firstAffect = affectsTableRows[0];
    expect(firstAffect.find('td:nth-of-type(4) span').text()).toBe('openshift-1-1');
    let secondAffect = affectsTableRows[1];
    expect(secondAffect.find('td:nth-of-type(4) span').text()).toBe('openshift-2-1');

    const componentHeader = subject.find('.affects-management table thead tr th:nth-of-type(4)');
    expect(componentHeader.exists()).toBe(true);
    expect(componentHeader.text()).toBe('Component');
    await componentHeader.trigger('click');
    await componentHeader.trigger('click');

    affectsTableRows = subject.findAll('.affects-management table tbody tr');
    firstAffect = affectsTableRows[0];
    expect(firstAffect.find('td:nth-of-type(4) span').text()).toBe('openshift-6-1');
    secondAffect = affectsTableRows[1];
    expect(secondAffect.find('td:nth-of-type(4) span').text()).toBe('openshift-5-1');
  });

  osimFullFlawTest('Affects can be filtered by affectedness', async ({ flaw }) => {
    const subject = mountFlawAffects(flaw);

    let affectsTableRows = subject.findAll('.affects-management table tbody tr');
    expect(affectsTableRows.length).toBe(6);

    let affectednessFilterBtn = subject.find('#affectedness-filter');
    expect(affectednessFilterBtn.find('i.bi-funnel').exists()).toBe(true);
    await affectednessFilterBtn.trigger('click');

    const affectednessFilterDropdownMenu = subject.findAll('ul.dropdown-menu')[0];
    expect(affectednessFilterDropdownMenu.exists()).toBe(true);

    const affectednessEmptyFilterOption = affectednessFilterDropdownMenu.find('li:first-of-type a');
    expect(affectednessEmptyFilterOption.exists()).toBe(true);
    expect(affectednessEmptyFilterOption.find('span').text()).toBe('EMPTY');
    await affectednessEmptyFilterOption.trigger('click');

    affectsTableRows = subject.findAll('.affects-management table tbody tr');
    expect(affectsTableRows.length).toBe(1);

    affectednessFilterBtn = subject.find('#affectedness-filter');
    expect(affectednessFilterBtn.find('i.bi-funnel-fill').exists()).toBe(true);
  });

  osimFullFlawTest('Affects can be filtered by resolution', async ({ flaw }) => {
    const subject = mountFlawAffects(flaw);

    let affectsTableRows = subject.findAll('.affects-management table tbody tr');
    expect(affectsTableRows.length).toBe(6);

    let resolutionFilterBtn = subject.find('#resolution-filter');
    expect(resolutionFilterBtn.find('i.bi-funnel').exists()).toBe(true);
    await resolutionFilterBtn.trigger('click');

    const resolutionFilterDropdownMenu = subject.findAll('ul.dropdown-menu')[1];
    expect(resolutionFilterDropdownMenu.exists()).toBe(true);

    const resolutionWontfixFilterOption = resolutionFilterDropdownMenu.find('li:nth-of-type(4) a');
    expect(resolutionWontfixFilterOption.exists()).toBe(true);
    expect(resolutionWontfixFilterOption.find('span').text()).toBe('WONTFIX');
    await resolutionWontfixFilterOption.trigger('click');

    affectsTableRows = subject.findAll('.affects-management table tbody tr');
    expect(affectsTableRows.length).toBe(1);

    resolutionFilterBtn = subject.find('#resolution-filter');
    expect(resolutionFilterBtn.find('i.bi-funnel-fill').exists()).toBe(true);
  });

  osimFullFlawTest('Affects can be filtered by impact', async ({ flaw }) => {
    const subject = mountFlawAffects(flaw);

    let affectsTableRows = subject.findAll('.affects-management table tbody tr');
    expect(affectsTableRows.length).toBe(6);

    let impactFilterBtn = subject.find('#impact-filter');
    expect(impactFilterBtn.find('i.bi-funnel').exists()).toBe(true);
    await impactFilterBtn.trigger('click');

    const impactFilterDropdownMenu = subject.findAll('ul.dropdown-menu')[2];
    expect(impactFilterDropdownMenu.exists()).toBe(true);

    const impactWontfixFilterOption = impactFilterDropdownMenu.find('li:nth-of-type(4) a');
    expect(impactWontfixFilterOption.exists()).toBe(true);
    expect(impactWontfixFilterOption.find('span').text()).toBe('CRITICAL');
    await impactWontfixFilterOption.trigger('click');

    affectsTableRows = subject.findAll('.affects-management table tbody tr');
    expect(affectsTableRows.length).toBe(1);

    impactFilterBtn = subject.find('#impact-filter');
    expect(impactFilterBtn.find('i.bi-funnel-fill').exists()).toBe(true);
  });

  osimFullFlawTest('Affect modules table cell have correct tootltip', async ({ flaw }) => {
    const subject = mountFlawAffects(flaw);
    const affectRow = subject.findAll('.affects-management table tbody tr')[1];
    const affectModuleDisplay = affectRow.find('td:nth-of-type(3) > span');
    expect(affectModuleDisplay.attributes('title')).toBe('openshift-2');
  });

  osimFullFlawTest('Affect components table cell have correct tootltip', async ({ flaw }) => {
    const subject = mountFlawAffects(flaw);
    const affectRow = subject.findAll('.affects-management table tbody tr')[1];
    const affectComponentDisplay = affectRow.find('td:nth-of-type(4) > span');
    expect(affectComponentDisplay.attributes('title')).toBe('openshift-2-1');
  });

  osimFullFlawTest('Displays tracker manager for individual affect', async ({ flaw }) => {
    const subject = mountFlawAffects(flaw);

    const affectsTableRows = subject.findAll('.affects-management table tbody tr');
    const affectRowTrackersBtn = affectsTableRows[0]
      .find('td:nth-of-type(9) .affect-tracker-cell button:first-of-type');
    expect(affectRowTrackersBtn.exists()).toBe(true);
    await affectRowTrackersBtn.trigger('click');

    const modal = subject.find('.modal');
    expect(modal.exists()).toBe(true);

    expect(subject.html()).toMatchSnapshot();
  });

  osimFullFlawTest('Displays tracker manager for a selection of affects', async ({ flaw }) => {
    const subject = mountFlawAffects(flaw);

    const affectsTableRows = subject.findAll('.affects-management table tbody tr');
    await affectsTableRows[0].trigger('click');
    await affectsTableRows[1].trigger('click');
    await affectsTableRows[2].trigger('click');

    const trackerManagerSelection = subject.find('.affects-toolbar .affects-table-actions .trackers-btn');
    expect(trackerManagerSelection.text()).toBe('Manage Trackers');
    await trackerManagerSelection.trigger('click');

    const modal = subject.find('.modal');
    expect(modal.exists()).toBe(true);

    expect(subject.html()).toMatchSnapshot();
  });
});
