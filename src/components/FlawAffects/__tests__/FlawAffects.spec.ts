import { type Component } from 'vue';

import { describe, expect } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useRouter } from 'vue-router';
import { flushPromises, VueWrapper } from '@vue/test-utils';
import * as sampleTrackersQueryResult from '@test-fixtures/sampleTrackersQueryResult.json';
import sampleFlawFull from '@test-fixtures/sampleFlawFull.json';

import { osimFullFlawTest, osimEmptyFlawTest, osimTestWithFlaw } from '@/components/__tests__/test-suite-helpers';

import { useFlaw } from '@/composables/useFlaw';
import { useFlawModel } from '@/composables/useFlawModel';
import { useFetchFlaw } from '@/composables/useFetchFlaw';
// import * as useCvss3Calculator from '@/composables/useCvss3Calculator';
import { useFlawAffectsModel } from '@/composables/useFlawAffectsModel';
import { useFlawCvssScores } from '@/composables/useFlawCvssScores';

import { useAffectsEditingStore } from '@/stores/AffectsEditingStore';
import { mountWithConfig, withSetup, importActual } from '@/__tests__/helpers';
import { getTrackersForFlaws } from '@/services/TrackerService';
import { getNextAccessToken } from '@/services/OsidbAuthService';
import type { ZodFlawType } from '@/types';

vi.mock('@/services/OsidbAuthService');
vi.mock('@/services/TrackerService');
vi.mock('@/composables/useFlaw', async () => {
  const { ref } = await import('vue');
  const flaw = (await import('@test-fixtures/sampleFlawFull.json')).default;
  return { useFlaw: vi.fn().mockReturnValue({ flaw: ref(flaw) }) };
});
vi.mock('@/composables/useFlawModel');
vi.mock('@/composables/useFetchFlaw');
vi.mock('@/composables/useFlawCvssScores');
// vi.mock('@/composables/useCvss4Calculator');
vi.mock('@/composables/useFlawAffectsModel');
vi.mock('@/stores/AffectsEditingStore');

let pinia: ReturnType<typeof createPinia>;

async function useMocks(flaw: ZodFlawType) {
  const { useFlaw: _useFlaw } = await importActual('@/composables/useFlaw');
  const { useFlawCvssScores: _useFlawCvssScores } = await importActual('@/composables/useFlawCvssScores');
  const { useFlawModel: _useFlawModel } = await importActual('@/composables/useFlawModel');
  const { useFetchFlaw: _useFetchFlaw } = await importActual('@/composables/useFetchFlaw');
  const { useFlawAffectsModel: _useFlawAffectsModel } = await importActual('@/composables/useFlawAffectsModel');

  const { useAffectsEditingStore: _useAffectsEditingStore } = await importActual('@/stores/AffectsEditingStore');

  // const { useCvss4Calculator: _useCvss4Calculator } = await importActual('@/composables/useCvss4Calculator');

  return {
    _useFlaw,
    _useFlawModel,
    _useFlawAffectsModel,
    _useAffectsEditingStore,
    _useFetchFlaw,
    _useFlawCvssScores,
    // _useCvss4Calculator,
    flaw,
  };
}

const mountFlawAffects = (Component: Component, mocks: Awaited<ReturnType<typeof useMocks>>) => {
  const {
    _useAffectsEditingStore,
    // _useCvss4Calculator,
    _useFetchFlaw,
    _useFlaw,
    _useFlawAffectsModel,
    _useFlawCvssScores,
    _useFlawModel,
    flaw,
  } = mocks;
  const [[mockedFlaw, errors]] = withSetup(() => {
    const mockedUseFlaw = _useFlaw();
    mockedUseFlaw.flaw.value = flaw;
    mockedUseFlaw.relatedFlaws.value = [flaw];
    vi.mocked(useFlaw).mockReturnValue(mockedUseFlaw);
    vi.mocked(useFetchFlaw).mockReturnValue(_useFetchFlaw());
    vi.mocked(useFlawAffectsModel).mockReturnValue(_useFlawAffectsModel());
    vi.mocked(useAffectsEditingStore).mockReturnValue(_useAffectsEditingStore());
    vi.mocked(useFlawCvssScores).mockReturnValue(_useFlawCvssScores());
    const mockedUseFlawModel = _useFlawModel(flaw, () => {});
    vi.mocked(useFlawModel).mockReturnValue(mockedUseFlawModel);
    // vi.mocked(useCvss4Calculator).mockReturnValue(_useCvss4Calculator());
    // vi.mocked(useCvss3Calculator). (_useCvss3Calculator());
    const errors = mockedUseFlawModel.errors.value.affects;
    return [mockedUseFlaw.flaw, errors];
  });

  return mountWithConfig(Component, {
    props: {
      embargoed: mockedFlaw.value.embargoed,
      relatedFlaws: [mockedFlaw.value],
      errors,
    },
    global: {
      stubs: {
        CvssCalculatorOverlayed: true,
        CvssVectorInput: true,
      },
    },
  });
};

type Subject = VueWrapper<Component>;
let subject: Subject;

describe('flawAffects', () => {
  // @ts-expect-error - flaw is not defined property
  beforeEach(async ({ flaw }) => {
    vi.clearAllMocks();
    vi.resetModules();
    pinia = createPinia();
    setActivePinia(pinia);
    vi.mocked(getTrackersForFlaws).mockResolvedValue(sampleTrackersQueryResult);
    vi.mocked(getNextAccessToken).mockResolvedValue('mocked-access-token');
    vi.mocked(useRouter);
    await flushPromises();
    const mocks = await useMocks(flaw);
    const importedComponent = await import('@/components/FlawAffects/FlawAffects.vue');
    const FlawAffects = importedComponent.default;
    subject = mountFlawAffects(FlawAffects, mocks);
  });

  afterAll(() => {
    vi.resetAllMocks();
    vi.resetModules();
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
    await flushPromises();

    let affectsTableEditingRows = subject.findAll('.affects-management table tbody tr.editing');
    expect(affectsTableEditingRows.length).toBe(0);

    const actionBtns = subject.findAll('.affects-toolbar .affects-table-actions .btn');
    const addAffectBtn = actionBtns.find(button => button.text() === 'Add New Affect');
    addAffectBtn?.trigger('click');
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

  const flawInvalidPurl = structuredClone(sampleFlawFull) as ZodFlawType;
  flawInvalidPurl.affects[0].purl = 'invalid-purl';
  osimTestWithFlaw(flawInvalidPurl)('Validates affect PURLs when present', async () => {
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
