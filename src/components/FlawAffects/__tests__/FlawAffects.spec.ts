import { ref, type Component } from 'vue';

import { describe, expect } from 'vitest';
import { flushPromises, VueWrapper } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import * as sampleTrackersQueryResult from '@test-fixtures/sampleTrackersQueryResult.json';
import { ascend } from 'ramda';

import { osimFullFlawTest, osimEmptyFlawTest } from '@/components/__tests__/test-suite-helpers';
import FlawAffects from '@/components/FlawAffects/FlawAffects.vue';

import { useFlaw } from '@/composables/useFlaw';

import { mountWithConfig } from '@/__tests__/helpers';
import { getTrackersForFlaws } from '@/services/TrackerService';

import { useFilterSortAffects } from '../useFilterSortAffects';

vi.mock('@/services/OsidbAuthService');
vi.mock('@/services/TrackerService');
vi.mock('@/composables/useFlaw', () =>
  ({ useFlaw: vi.fn().mockReturnValue({ flaw: {}, relatedFlaws: [] }) }),
);
vi.mock('@/composables/useFlawModel');
vi.mock('@/composables/useFetchFlaw', async importOriginal => ({
  ...await importOriginal<typeof import('@/composables/useFetchFlaw')>(),
}));

type Subject = VueWrapper<Component>;
let subject: Subject;

describe('flawAffects', () => {
  // @ts-expect-error - flaw is not defined property
  beforeEach(({ flaw }) => {
    // We need to reset localStorage as it is used by SettingsStore and it leaks between tests
    localStorage.clear();

    vi.mocked(getTrackersForFlaws).mockResolvedValue(sampleTrackersQueryResult);
    vi.mocked(useFlaw, { partial: true }).mockReturnValue({ flaw: ref(flaw), relatedFlaws: ref([flaw]) });

    // Because this composable has all this variables in the "module scope",
    // they persist between tests, so we need to manually reset them.

    const affectsFilters = useFilterSortAffects();
    affectsFilters.selectedModules.value = [];
    affectsFilters.impactFilters.value = [];
    affectsFilters.resolutionFilters.value = [];
    affectsFilters.affectednessFilters.value = [];
    affectsFilters.sortKey.value = 'ps_module';
    affectsFilters.sortOrder.value = ascend;

    subject = mountWithConfig(FlawAffects, {
      props: {
        errors: [],
        relatedFlaws: [flaw],
        embargoed: flaw.embargoed,
      },
    },
    // Since we have some logic inside the stores, we need the actions to execute
    // otherwise we'll need to provide implementation for AffetsEditingStore
    [createTestingPinia({ stubActions: false })],
    );
  });

  osimEmptyFlawTest('Correctly renders the component when there are no affects to display',
    () => expect(subject.html()).toMatchSnapshot());

  osimFullFlawTest('Correctly renders the component when there are affects to display',
    () => expect(subject.html()).toMatchSnapshot());

  osimFullFlawTest('Filter button for module with trackers have correct tootltip', () => {
    const moduleFilterBtn = subject.findAll('.module-btn')[0];
    expect(moduleFilterBtn.attributes('title')).toBe('openshift-1');
  });

  osimFullFlawTest('Filter button for module without trackers have correct tootltip',
    () => {
      const moduleFilterBtn = subject.findAll('.module-btn')[1];
      expect(moduleFilterBtn.attributes('title')).toBe('openshift-2\nThis module has no trackers associated');
    });

  osimFullFlawTest('Filter tables when affected modules are selected', async () => {
    let affectsTableRows = subject.findAll('.affects-management table tbody tr');
    let rowCount = affectsTableRows.length;
    expect(rowCount).toBe(6);

    const moduleBtns = subject.findAll('.module-btn');
    await moduleBtns[0].trigger('click');

    affectsTableRows = subject.findAll('.affects-management table tbody tr');
    rowCount = affectsTableRows.length;
    expect(rowCount).toBe(1);
  });

  osimFullFlawTest('Per page setting correctly changes the table page items number', async () => {
    let affectsTableRows = subject.findAll('.affects-management table tbody tr');
    let rowCount = affectsTableRows.length;
    expect(rowCount).toBe(6);
    let itemsPerPageIndicator = subject.find('.affects-toolbar .badges input');
    expect((itemsPerPageIndicator.element as HTMLInputElement).value).toBe('10');

    const reduceItemsBtn = subject.find('.affects-toolbar .badges .btn .bi-dash-square');
    await reduceItemsBtn.trigger('click');

    affectsTableRows = subject.findAll('.affects-management table tbody tr');
    rowCount = affectsTableRows.length;
    expect(rowCount).toBe(5);
    itemsPerPageIndicator = subject.find('.affects-toolbar .badges input');
    expect((itemsPerPageIndicator.element as HTMLInputElement).value).toBe('5');

    const increaseItemsBtn = subject.find('.affects-toolbar .badges .btn .bi-plus-square');
    await increaseItemsBtn.trigger('click');

    affectsTableRows = subject.findAll('.affects-management table tbody tr');
    rowCount = affectsTableRows.length;
    expect(rowCount).toBe(6); itemsPerPageIndicator = subject.find('.affects-toolbar .badges input');
    expect((itemsPerPageIndicator.element as HTMLInputElement).value).toBe('10');
  });

  osimFullFlawTest('Show all button works properly', async () => {
    let badgeButtons = subject.findAll('.badges div');
    const showAllBtn = badgeButtons[1];
    expect(badgeButtons.length).toBe(2);
    expect(showAllBtn.text()).toBe('Show all affects (6)');

    await showAllBtn.trigger('click');

    const affectsTableRows = subject.findAll('.affects-management table tbody tr');
    const rowCount = affectsTableRows.length;
    expect(rowCount).toBe(6);
    badgeButtons = subject.findAll('.badges div');
    expect(badgeButtons.length).toBe(1);
  });

  osimFullFlawTest('new affects are added in edit mode', async () => {
    let affectsTableEditingRows = subject.findAll('.affects-management table tbody tr.editing');
    expect(affectsTableEditingRows.length).toBe(0);

    const actionBtns = subject.findAll('.affects-toolbar .affects-table-actions .btn');
    const addAffectBtn = actionBtns.find(button => button.text() === 'Add New Affect');
    await addAffectBtn?.trigger('click');
    await flushPromises();

    affectsTableEditingRows = subject.findAll('.affects-management table tbody tr.editing');
    expect(affectsTableEditingRows.length).toBe(1);
  });

  osimFullFlawTest('Affects are selectable by clicking in the row', async () => {
    let affectsTableSelectedRows = subject.findAll('.affects-management table tbody tr.selected');
    expect(affectsTableSelectedRows.length).toBe(0);

    const affectsTableRows = subject.findAll('.affects-management table tbody tr');
    await affectsTableRows[0].trigger('click');
    affectsTableSelectedRows = subject.findAll('.affects-management table tbody tr.selected');
    expect(affectsTableSelectedRows.length).toBe(1);
  });

  osimFullFlawTest('Selection actions are displayed on toolbar', async () => {
    let tableActions = subject.findAll('.affects-toolbar .affects-table-actions .btn');
    expect(tableActions.length).toBe(1);

    const affectsTableRows = subject.findAll('.affects-management table tbody tr');
    await affectsTableRows[0].trigger('click');
    await affectsTableRows[1].trigger('click');

    tableActions = subject.findAll('.affects-toolbar .affects-table-actions .btn');
    expect(tableActions.length).toBe(4);
  });

  osimFullFlawTest('Affects can be set to edit mode', async () => {
    await flushPromises();

    let affectsTableEditingRows = subject.findAll('.affects-management table tbody tr.editing');
    expect(affectsTableEditingRows.length).toBe(0);

    const affectsTableRows = subject.findAll('.affects-management table tbody tr');
    const affectRowEditBtn = affectsTableRows[0].find('td:last-of-type button');
    expect(affectRowEditBtn.exists()).toBe(true);

    await affectRowEditBtn.trigger('click');
    await flushPromises();
    affectsTableEditingRows = subject.findAll('.affects-management table tbody tr.editing');
    expect(affectsTableEditingRows.length).toBe(1);
  });

  osimFullFlawTest('Show DEFER resolution option when affect impact is LOW', async () => {
    const affectsTableRows = subject.findAll('.affects-management table tbody tr');
    const affectRowEditBtn = affectsTableRows[0].find('td:last-of-type button:first-of-type');
    expect(affectRowEditBtn.exists()).toBe(true);
    await affectRowEditBtn.trigger('click');

    const affectsTableEditingRows = subject.findAll('.affects-management table tbody tr.editing');
    const affectednessSelect = affectsTableEditingRows[0].find('td:nth-of-type(6) select');
    const resolutionSelect = affectsTableEditingRows[0].find('td:nth-of-type(8) select');
    const impactSelect = affectsTableEditingRows[0].find('td:nth-of-type(9) select');

    const selectedImpact = impactSelect.find('option[selected]');
    expect(selectedImpact.text()).toBe('LOW');

    const selectedAffectedness = affectednessSelect.find('option[selected]');
    expect(selectedAffectedness.text()).toBe('AFFECTED');

    const resolutionOptions = resolutionSelect.findAll('option').map(wrapper => wrapper.text());
    expect(resolutionOptions.length).toBe(4);
    expect(resolutionOptions.includes('DELEGATED')).toBe(true);
  });

  osimFullFlawTest('Don\'t show DEFER resolution option if impact is not LOW', async () => {
    const affectsTableRows = subject.findAll('.affects-management table tbody tr');
    const affectRowEditBtn = affectsTableRows[5].find('td:last-of-type button:first-of-type');
    expect(affectRowEditBtn.exists()).toBe(true);
    await affectRowEditBtn.trigger('click');

    const affectsTableEditingRows = subject.findAll('.affects-management table tbody tr.editing');
    const affectednessSelect = affectsTableEditingRows[0].find('td:nth-of-type(6) select');
    const resolutionSelect = affectsTableEditingRows[0].find('td:nth-of-type(8) select');
    const impactSelect = affectsTableEditingRows[0].find('td:nth-of-type(9) select');

    const selectedImpact = impactSelect.find('option[selected]');
    expect(selectedImpact.text()).toBe('CRITICAL');

    const selectedAffectedness = affectednessSelect.find('option[selected]');
    expect(selectedAffectedness.text()).toBe('');

    const resolutionOptions = resolutionSelect.findAll('option').map(wrapper => wrapper.text());
    expect(resolutionOptions.includes('DEFER')).toBe(false);
  });

  osimFullFlawTest('Changing affect to not affected automatically sets empty resolution', async () => {
    const affectsTableRows = subject.findAll('.affects-management table tbody tr');

    let resolutionSelect = affectsTableRows[0].find('td:nth-of-type(6) span');
    expect(resolutionSelect.text()).not.toEqual('');

    const affectRowEditBtn = affectsTableRows[0].find('td:last-of-type button:first-of-type');
    expect(affectRowEditBtn.exists()).toBe(true);
    await affectRowEditBtn.trigger('click');

    const affectsTableEditingRows = subject.findAll('.affects-management table tbody tr.editing');
    const affectednessSelect = affectsTableEditingRows[0].find('td:nth-of-type(6) select');
    await affectednessSelect.setValue('NOTAFFECTED');
    const selectedAffectedness = affectednessSelect.find('option[selected]');
    expect(selectedAffectedness.text()).toBe('NOTAFFECTED');

    const affectRowCommitBtn = affectsTableEditingRows[0].find('td:last-of-type button:first-of-type');
    expect(affectRowCommitBtn.exists()).toBe(true);
    await affectRowCommitBtn.trigger('click');

    resolutionSelect = affectsTableRows[0].find('td:nth-of-type(7) span');
    expect(resolutionSelect.text()).toBe('');
  });

  osimFullFlawTest('justification select is disabled when affectedness is different to not affected', async () => {
    const affectsTableRows = subject.findAll('.affects-management table tbody tr');

    const affectednessSelect = affectsTableRows[0].find('td:nth-of-type(6) span');
    expect(affectednessSelect.text()).not.equal('NOTAFFECTED');

    const affectRowEditBtn = affectsTableRows[0].find('td:last-of-type button:first-of-type');
    await affectRowEditBtn.trigger('click');

    const affectsTableEditingRows = subject.findAll('.affects-management table tbody tr.editing');
    const justificationSelect = affectsTableEditingRows[0].find('td:nth-of-type(7) select');
    expect(justificationSelect.attributes()).toHaveProperty('disabled');
  });

  osimFullFlawTest('justification select is enabled when affectedness is set to not affected', async () => {
    const affectsTableRows = subject.findAll('.affects-management table tbody tr');

    const affectRowEditBtn = affectsTableRows[0].find('td:last-of-type button:first-of-type');
    await affectRowEditBtn.trigger('click');

    const affectednessSelect = affectsTableRows[0].find('td:nth-of-type(6) select');
    await affectednessSelect.setValue('NOTAFFECTED');

    const affectsTableEditingRows = subject.findAll('.affects-management table tbody tr.editing');
    const justificationSelect = affectsTableEditingRows[0].find('td:nth-of-type(7) select');
    expect(justificationSelect.attributes()).not.toHaveProperty('disabled');
  });

  osimFullFlawTest('Validates affect PURLs when present', async ({ flaw }) => {
    subject = mountWithConfig(FlawAffects, {
      props: {
        errors: [{ purl: 'Invalid' }],
        relatedFlaws: [flaw],
        embargoed: flaw.embargoed,
      },
    },
    );
    const affectRow = subject.find('.affects-management table tbody tr');
    const purlField = affectRow.find('td:nth-of-type(5)');
    const purlInputError = purlField.find('.affect-field-error');
    expect(purlInputError.exists()).toBe(true);
  });

  osimFullFlawTest('Affects can be modified', async () => {
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

  osimFullFlawTest('Affect changes can be discarded', async () => {
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

  osimFullFlawTest('Toolbar state badges can be activate to filter affects', async () => {
    let badgeBtns = subject.findAll('.affects-toolbar .badges .badge-btn');
    expect(badgeBtns.length).toBe(1);

    let affectsTableRows = subject.findAll('.affects-management table tbody tr');
    expect(affectsTableRows.length).toBe(6);

    const affectRowEditBtn = affectsTableRows[0].find('td:last-of-type button:first-of-type');
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

  osimFullFlawTest.each([
    { column: 'Module', columnIndex: 3, first: 'openshift-6', last: 'openshift-1' },
    { column: 'Component', columnIndex: 4, first: 'openshift-1-1', last: 'openshift-6-1' },
    { column: 'Affectedness', columnIndex: 6, first: 'AFFECTED', last: '' },
    { column: 'Resolution', columnIndex: 8, first: 'DELEGATED', last: 'WONTFIX' },
    { column: 'Impact', columnIndex: 9, first: 'CRITICAL', last: 'LOW' },
    { column: 'Trackers', columnIndex: 11, first: '0', last: '4' },
  ])('Affects can be sorted by $column column', async ({ column, columnIndex, first, last }) => {
    const componentHeader = subject.find(`.affects-management table thead tr th:nth-of-type(${columnIndex})`);
    expect(componentHeader.text()).toStrictEqual(expect.stringMatching(column));

    // Ascending order
    await componentHeader.trigger('click');

    let affectsTableRows = subject.findAll('.affects-management table tbody tr');
    let firstAffect = affectsTableRows[0];
    let lastAffect = affectsTableRows.at(-1)!;

    expect(firstAffect.find(`td:nth-of-type(${columnIndex}) span`).text()).toBe(first);
    expect(lastAffect.find(`td:nth-of-type(${columnIndex}) span`).text()).toBe(last);

    // Descending order
    await componentHeader.trigger('click');

    affectsTableRows = subject.findAll('.affects-management table tbody tr');
    firstAffect = affectsTableRows[0];
    lastAffect = affectsTableRows.at(-1)!;

    expect(firstAffect.find(`td:nth-of-type(${columnIndex}) span`).text()).toBe(last);
    expect(lastAffect.find(`td:nth-of-type(${columnIndex}) span`).text()).toBe(first);
  });

  osimFullFlawTest.each([
    { column: 'Affectedness', columnIndex: 6, option: 'EMPTY', optionValue: '', optionIndex: 1 },
    { column: 'Resolution', columnIndex: 8, option: 'WONTFIX', optionValue: 'WONTFIX', optionIndex: 4 },
    { column: 'Impact', columnIndex: 9, option: 'CRITICAL', optionValue: 'CRITICAL', optionIndex: 4 },
  ])('Affects can be filtered by $column', async ({ column, columnIndex, option, optionIndex, optionValue }) => {
    const componentHeader = subject.find(`.affects-management table thead tr th:nth-of-type(${columnIndex})`);
    expect(componentHeader.text()).toStrictEqual(expect.stringMatching(column));

    const filterBtn = componentHeader.find('button');
    expect(filterBtn.find('i.bi-funnel').exists()).toBe(true);
    await filterBtn.trigger('click');

    const filterDropdownMenu = componentHeader.find('ul.dropdown-menu');
    expect(filterDropdownMenu.exists()).toBe(true);

    const filterOption = filterDropdownMenu.find(`li:nth-of-type(${optionIndex}) a`);
    expect(filterOption.find('span').text()).toBe(option);
    await filterOption.trigger('click');
    await filterBtn.trigger('click');

    const affectsTableRows = subject.findAll('.affects-management table tbody tr');
    for (const row of affectsTableRows) {
      expect(row.find(`td:nth-of-type(${columnIndex}) span`).text()).toBe(optionValue);
    }
  });

  osimFullFlawTest('Affect modules table cell have correct tootltip', async () => {
    const affectRow = subject.findAll('.affects-management table tbody tr')[1];
    const affectModuleDisplay = affectRow.find('td:nth-of-type(3) > span');
    expect(affectModuleDisplay.attributes('title')).toBe('openshift-2');
  });

  osimFullFlawTest('Affect components table cell have correct tootltip', async () => {
    const affectRow = subject.findAll('.affects-management table tbody tr')[1];
    const affectComponentDisplay = affectRow.find('td:nth-of-type(4) > span');
    expect(affectComponentDisplay.attributes('title')).toBe('openshift-2-1');
  });

  osimFullFlawTest('Displays tracker manager for individual affect', async () => {
    const affectsTableRows = subject.findAll('.affects-management table tbody tr');
    const affectRowTrackersBtn = affectsTableRows[0]
      .find('td:nth-of-type(11) .affect-tracker-cell button:first-of-type');
    expect(affectRowTrackersBtn.exists()).toBe(true);
    await affectRowTrackersBtn.trigger('click');

    const modal = subject.find('.modal');
    expect(modal.exists()).toBe(true);

    expect(subject.html()).toMatchSnapshot();
  });

  osimFullFlawTest('Displays tracker manager for a selection of affects', async () => {
    const affectsTableRows = subject.findAll('.affects-management table tbody tr');
    await affectsTableRows[0].trigger('click');
    await affectsTableRows[1].trigger('click');
    await affectsTableRows[2].trigger('click');

    const trackerManagerSelection = subject.find('.affects-toolbar .affects-table-actions .trackers-btn');
    const buttonLabel = trackerManagerSelection.find('span:nth-of-type(1)');
    const affectCounter = trackerManagerSelection.find('span:nth-of-type(2)');
    expect(buttonLabel.text()).toBe('Manage Trackers');
    expect(affectCounter.text()).toBe('3');
    await trackerManagerSelection.trigger('click');

    const modal = subject.find('.modal');
    expect(modal.exists()).toBe(true);

    expect(subject.html()).toMatchSnapshot();
  });
});
