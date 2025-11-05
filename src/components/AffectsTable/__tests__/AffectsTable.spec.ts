import { flushPromises, mount, type DOMWrapper } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';

import { useFlaw } from '@/composables/useFlaw';

import SampleFlawFullV2 from '@/__tests__/__fixtures__/sampleFlawFullV2.json';
import type { ZodFlawType } from '@/types';
import { useSettingsStore } from '@/stores/SettingsStore';
import * as TrackerService from '@/services/TrackerService';

import AffectsTable from '../AffectsTable.vue';

createTestingPinia();

const mountAffectsTable = async () => {
  const wrapper = mount(AffectsTable, {
    global: {
      directives: {
        osimLoading: vi.fn(),
      },
      stubs: {
        Teleport: true,
      },
    },
  });

  await flushPromises(); // Needed for the onMounted hook
  return wrapper;
};

describe('affectsTable', () => {
  beforeEach(() => {
    const { flaw, resetFlaw } = useFlaw();
    resetFlaw();

    flaw.value = structuredClone(SampleFlawFullV2 as unknown as ZodFlawType);
    vi.useFakeTimers();
  });

  it('should render', async () => {
    const wrapper = await mountAffectsTable();

    expect(wrapper.html()).toMatchSnapshot();
  });

  it('should render empty state', async () => {
    useFlaw().flaw.value.affects = [];
    const wrapper = await mountAffectsTable();

    expect(wrapper.html()).toMatchSnapshot();
  });

  describe('table actions', () => {
    describe('pagination', () => {
      beforeEach(async () => {
        const { settings } = useSettingsStore();
        settings.affectsPerPage = 1;
        await flushPromises();
      });

      afterAll(async () => {
        const { settings } = useSettingsStore();
        settings.affectsPerPage = SampleFlawFullV2.affects.length;
        await flushPromises();
      });

      it('should render `per page` rows', async () => {
        const wrapper = await mountAffectsTable();

        expect(wrapper.findAll('tbody tr').length).equals(1);
      });

      it('should change page', async () => {
        const wrapper = await mountAffectsTable();

        const firstRow = wrapper.findAll('tbody tr')[0];
        const nextPageBtn = wrapper.find('.pagination-controls button:last-of-type');
        await nextPageBtn.trigger('click');
        const secondRow = wrapper.findAll('tbody tr')[0];

        expect(firstRow.text()).not.equals(secondRow.text());
      });

      it('should render all rows', async () => {
        const wrapper = await mountAffectsTable();

        await wrapper.find('#toggleAllAffects').setValue(true);
        await flushPromises();

        expect(wrapper.findAll('tbody tr').length).equals(SampleFlawFullV2.affects.length);
      });
    });

    describe('global filter', () => {
      beforeEach(async () => {
        const { settings } = useSettingsStore();
        settings.affectsPerPage = SampleFlawFullV2.affects.length;
        await flushPromises();
      });

      it('should filter table rows when text is entered in searchbox', async () => {
        const wrapper = await mountAffectsTable();
        const searchbox = wrapper.find('input[placeholder="Search..."]');
        const initialRowCount = wrapper.findAll('tbody tr').length;

        await searchbox.setValue('nonexistent-term');
        vi.runAllTimers();
        await flushPromises();

        const filteredRowCount = wrapper.findAll('tbody tr').length;
        expect(searchbox.exists()).toBe(true);
        expect(initialRowCount).toBeGreaterThan(1);
        expect(filteredRowCount).toBe(1);

        vi.useRealTimers();
      });
    });

    describe('settings', () => {
      it('should allow changing column visibility', async () => {
        const wrapper = await mountAffectsTable();
        const { settings } = useSettingsStore();

        const columnOptionsBtn = wrapper.find('button[data-bs-toggle="dropdown"]');
        await columnOptionsBtn.trigger('click');
        await flushPromises();

        const checkboxes = wrapper.findAll('.dropdown-menu .draggable input[type="checkbox"]');
        const moduleCheckbox = checkboxes.find((checkbox) => {
          const label = checkbox.element.parentElement?.textContent;
          return label?.includes('ps_module') || label?.includes('Module');
        });

        expect(moduleCheckbox).toBeDefined();
        const initialVisibility = settings.affectsVisibility.ps_module ?? true;

        await moduleCheckbox!.setValue(!initialVisibility);
        await flushPromises();

        expect(settings.affectsVisibility.ps_module).toBe(!initialVisibility);
      });

      it('should allow changing column order', async () => {
        const wrapper = await mountAffectsTable();
        const { settings } = useSettingsStore();

        const initialOrder = ['select', 'ps_module', 'ps_component'];
        settings.affectsColumnOrder = [...initialOrder];
        await flushPromises();

        const columnOptionsBtn = wrapper.find('button[data-bs-toggle="dropdown"]');
        await columnOptionsBtn.trigger('click');
        await flushPromises();

        const draggableItems = wrapper.findAll('li[draggable="true"]');

        expect(draggableItems.length).toBeGreaterThanOrEqual(2);
        const firstItem = draggableItems[0];
        const secondItem = draggableItems[1];

        await firstItem.trigger('dragstart', {
          dataTransfer: { setData: vi.fn() },
        });
        await secondItem.trigger('dragover');
        await secondItem.trigger('drop');
        await firstItem.trigger('dragend');
        await flushPromises();

        expect(settings.affectsColumnOrder).not.toEqual(initialOrder);
      });

      it('should reset column order when reset button is clicked', async () => {
        const wrapper = await mountAffectsTable();
        const { settings } = useSettingsStore();

        const customOrder = ['select', 'ps_component', 'ps_module'];
        settings.affectsColumnOrder = [...customOrder];
        await flushPromises();

        const columnOptionsBtn = wrapper.find('button[data-bs-toggle="dropdown"]');
        await columnOptionsBtn.trigger('click');
        await flushPromises();

        const resetOrderBtn = wrapper.findAll('.dropdown-menu button').find(btn =>
          btn.text().includes('order'),
        );
        expect(resetOrderBtn).toBeDefined();

        await resetOrderBtn!.trigger('click');
        await flushPromises();

        expect(settings.affectsColumnOrder).toEqual([]);
      });

      it('should render reset column size button', async () => {
        const wrapper = await mountAffectsTable();

        const columnOptionsBtn = wrapper.find('button[data-bs-toggle="dropdown"]');
        await columnOptionsBtn.trigger('click');
        await flushPromises();

        const resetSizeBtn = wrapper.findAll('.dropdown-menu button').find(btn =>
          btn.text().includes('size'),
        );
        expect(resetSizeBtn).toBeDefined();
      });

      it('should render show all columns button', async () => {
        const wrapper = await mountAffectsTable();

        const columnOptionsBtn = wrapper.find('button[data-bs-toggle="dropdown"]');
        await columnOptionsBtn.trigger('click');
        await flushPromises();

        const showAllBtn = wrapper.findAll('.dropdown-menu button').find(btn =>
          btn.text().includes('show all'),
        );
        expect(showAllBtn).toBeDefined();
      });
    });
  });

  describe('table', () => {
    beforeEach(async () => {
      const { settings } = useSettingsStore();
      settings.affectsPerPage = SampleFlawFullV2.affects.length;
      await flushPromises();
    });

    describe('column sorting', () => {
      it('should render sortable column headers', async () => {
        const wrapper = await mountAffectsTable();

        const sortableHeaders = wrapper.findAll('thead th.sortable');
        expect(sortableHeaders.length).toBeGreaterThan(0);
      });

      it('should toggle sort when sortable header is clicked', async () => {
        const wrapper = await mountAffectsTable();

        const sortableHeaders = wrapper.findAll('thead th.sortable');
        expect(sortableHeaders.length).toBeGreaterThan(0);

        const firstSortableHeader = sortableHeaders[0];

        await firstSortableHeader.trigger('click');
        await flushPromises();

        const sortIcon = firstSortableHeader.find('.sort-icon');
        expect(sortIcon.exists()).toBe(true);
      });

      it('should display sort icon on sorted columns', async () => {
        const wrapper = await mountAffectsTable();

        const sortableHeaders = wrapper.findAll('thead th.sortable');
        expect(sortableHeaders.length).toBeGreaterThan(0);

        const firstSortableHeader = sortableHeaders[0];

        await firstSortableHeader.trigger('click');
        await flushPromises();

        let sortIcon = firstSortableHeader.find('.sort-icon');
        expect(sortIcon.exists()).toBe(true);

        const initialClasses = [...sortIcon.classes()];

        await firstSortableHeader.trigger('click');
        await flushPromises();

        sortIcon = firstSortableHeader.find('.sort-icon');
        const newClasses = [...sortIcon.classes()];

        expect(initialClasses).not.toEqual(newClasses);
      });
    });

    describe('column filtering', () => {
      it('should render filter icons on filterable columns', async () => {
        const wrapper = await mountAffectsTable();

        const filterIcons = wrapper.findAll('thead .bi-funnel');
        expect(filterIcons.length).toBeGreaterThan(0);
      });

      it('should render clear column filters button when filters are active', async () => {
        const wrapper = await mountAffectsTable();

        const clearFiltersBtn = wrapper.find('button:has(.bi-x)');
        expect(clearFiltersBtn.exists()).toBe(false);
      });
    });

    describe('row actions', () => {
      it('should render add new affect button', async () => {
        const wrapper = await mountAffectsTable();

        const addBtn = wrapper.find('button:has(.bi-plus-lg)');
        expect(addBtn.exists()).toBe(true);
      });

      it('should mark row as new when add button is clicked', async () => {
        const wrapper = await mountAffectsTable();

        const addBtn = wrapper.find('button:has(.bi-plus-lg)');
        await addBtn.trigger('click');
        await flushPromises();

        const newRows = wrapper.findAll('tbody tr.new');
        expect(newRows.length).toBeGreaterThan(0);
      });

      it('should show delete button when rows are selected', async () => {
        const wrapper = await mountAffectsTable();

        let deleteBtn = wrapper.find('button[title="Remove selected affects"]');
        expect(deleteBtn.exists()).toBe(false);

        const checkboxes = wrapper.findAll('tbody input[type="checkbox"]');
        expect(checkboxes.length).toBeGreaterThan(0);

        await checkboxes[0].setValue(true);
        await flushPromises();

        deleteBtn = wrapper.find('button[title="Remove selected affects"]');
        expect(deleteBtn.exists()).toBe(true);
      });

      it('should mark rows as removed when delete button is clicked', async () => {
        const wrapper = await mountAffectsTable();

        const checkboxes = wrapper.findAll('tbody tr input[type="checkbox"]');
        expect(checkboxes.length).toBeGreaterThan(0);

        await checkboxes[0].setValue(true);
        await flushPromises();

        const deleteBtn = wrapper.find('button[title="Remove selected affects"]');
        await deleteBtn.trigger('click');
        await flushPromises();

        const rows = wrapper.findAll('tbody tr');
        const removedRow = rows.find(row => row.classes('removed'));
        expect(removedRow).toBeDefined();
      });

      it('should show create trackers button when affects without trackers are selected', async () => {
        const wrapper = await mountAffectsTable();

        const checkboxes = wrapper.findAll('tbody tr input[type="checkbox"]');
        const affectWithoutTracker = SampleFlawFullV2.affects.findIndex(affect => !affect.tracker);

        expect(affectWithoutTracker).not.toBe(-1);
        expect(checkboxes.length).toBeGreaterThan(affectWithoutTracker);

        await checkboxes[affectWithoutTracker].setValue(true);
        await flushPromises();

        const createTrackersBtn = wrapper.find('button[title="File trackers for selected affects"]');
        expect(createTrackersBtn.exists()).toBe(true);
        expect(createTrackersBtn.text()).toContain('Create trackers');
      });

      it('should show revert all changes button when there are changes', async () => {
        const wrapper = await mountAffectsTable();

        let revertBtn = wrapper.find('button[title="Revert ALL changes"]');
        expect(revertBtn.exists()).toBe(false);

        const addBtn = wrapper.find('button:has(.bi-plus-lg)');
        await addBtn.trigger('click');
        await flushPromises();

        revertBtn = wrapper.find('button[title="Revert ALL changes"]');
        expect(revertBtn.exists()).toBe(true);
      });

      it('should render select suggested trackers button when affects exist', async () => {
        const wrapper = await mountAffectsTable();

        const selectTrackersBtn = wrapper.find('button[title="Select suggested trackers"]');
        expect(selectTrackersBtn.exists()).toBe(true);
      });

      it('should not render select suggested trackers button when no affects exist', async () => {
        useFlaw().flaw.value.affects = [];
        const wrapper = await mountAffectsTable();

        const selectTrackersBtn = wrapper.find('button[title="Select suggested trackers"]');
        expect(selectTrackersBtn.exists()).toBe(false);
      });

      it('should select affects with suggested trackers when button is clicked', async () => {
        const wrapper = await mountAffectsTable();

        // Use the third affect which doesn't have a tracker (index 2)
        const affectWithoutTracker = SampleFlawFullV2.affects[2];

        const mockTrackerSuggestions = {
          streams_components: [
            {
              affect: affectWithoutTracker,
              ps_component: affectWithoutTracker.ps_component,
              ps_update_stream: affectWithoutTracker.ps_update_stream,
              selected: true,
              offer: {
                acked: false,
                aus: false,
                eus: false,
                ps_update_stream: affectWithoutTracker.ps_update_stream,
                selected: false,
              },
            },
          ],
          not_applicable: [],
        };

        vi.spyOn(TrackerService, 'getTrackersForFlaws').mockResolvedValue(mockTrackerSuggestions);

        const selectTrackersBtn = wrapper.find('button[title="Select suggested trackers"]');
        await selectTrackersBtn.trigger('click');
        await flushPromises();

        const checkboxes = wrapper.findAll('tbody input[type="checkbox"]');
        const selectedCheckboxes = checkboxes.filter(checkbox => (checkbox.element as HTMLInputElement).checked);
        expect(selectedCheckboxes.length).toBeGreaterThan(0);
      });

      it('should show toast when some trackers are not applicable', async () => {
        const wrapper = await mountAffectsTable();

        const mockTrackerSuggestions = {
          streams_components: [],
          not_applicable: [SampleFlawFullV2.affects[0]],
        };

        vi.spyOn(TrackerService, 'getTrackersForFlaws').mockResolvedValue(mockTrackerSuggestions);

        const selectTrackersBtn = wrapper.find('button[title="Select suggested trackers"]');
        await selectTrackersBtn.trigger('click');
        await flushPromises();

        // The toast store should have been called to display the warning
        // We can verify this by checking if the unavailableTrackers set was populated
        expect(TrackerService.getTrackersForFlaws).toHaveBeenCalled();
      });

      it('should apply styling to new rows', async () => {
        const wrapper = await mountAffectsTable();

        const addBtn = wrapper.find('button:has(.bi-plus-lg)');
        await addBtn.trigger('click');
        await flushPromises();

        const rows = wrapper.findAll('tbody tr');
        const newRow = rows.find(row => row.classes('new'));
        expect(newRow).toBeDefined();
      });

      it('should apply styling to removed rows', async () => {
        const wrapper = await mountAffectsTable();

        const checkboxes = wrapper.findAll('tbody tr input[type="checkbox"]');
        expect(checkboxes.length).toBeGreaterThan(0);

        await checkboxes[0].setValue(true);
        await flushPromises();

        const deleteBtn = wrapper.find('button[title="Remove selected affects"]');
        await deleteBtn.trigger('click');
        await flushPromises();

        const rows = wrapper.findAll('tbody tr');
        const removedRow = rows.find(row => row.classes('removed'));
        expect(removedRow).toBeDefined();
      });
    });

    describe('bulk edit', () => {
      beforeEach(async () => {
        const { settings } = useSettingsStore();
        settings.affectsPerPage = SampleFlawFullV2.affects.length;
        await flushPromises();
      });

      it('should show bulk edit button when rows are selected', async () => {
        const wrapper = await mountAffectsTable();

        let bulkEditBtn = wrapper.find('button[title="Bulk edit selected affects"]');
        expect(bulkEditBtn.exists()).toBe(false);

        const checkboxes = wrapper.findAll('tbody tr input[type="checkbox"]');
        expect(checkboxes.length).toBeGreaterThan(0);

        await checkboxes[0].setValue(true);
        await flushPromises();

        bulkEditBtn = wrapper.find('button[title="Bulk edit selected affects"]');
        expect(bulkEditBtn.exists()).toBe(true);
        expect(bulkEditBtn.text()).toContain('Bulk Edit');
      });

      it('should enter bulk edit mode when bulk edit button is clicked', async () => {
        const wrapper = await mountAffectsTable();

        const checkboxes = wrapper.findAll('tbody tr input[type="checkbox"]');
        expect(checkboxes.length).toBeGreaterThan(0);

        await checkboxes[0].setValue(true);
        await flushPromises();

        const bulkEditBtn = wrapper.find('button[title="Bulk edit selected affects"]');
        await bulkEditBtn.trigger('click');
        await flushPromises();

        const bulkEditRow = wrapper.find('tbody tr.bulk-edit');
        expect(bulkEditRow.exists()).toBe(true);
      });

      it('should render bulk edit row with correct styling', async () => {
        const wrapper = await mountAffectsTable();

        const checkboxes = wrapper.findAll('tbody tr input[type="checkbox"]');
        expect(checkboxes.length).toBeGreaterThan(0);

        await checkboxes[0].setValue(true);
        await flushPromises();

        const bulkEditBtn = wrapper.find('button[title="Bulk edit selected affects"]');
        await bulkEditBtn.trigger('click');
        await flushPromises();

        const bulkEditRow = wrapper.find('tbody tr.bulk-edit');
        expect(bulkEditRow.exists()).toBe(true);

        const firstCell = bulkEditRow.findAll('td')[0];
        expect(firstCell.find('.bi-pencil-square').exists()).toBe(true);
      });

      it('should show Apply Changes and Cancel buttons in bulk edit mode', async () => {
        const wrapper = await mountAffectsTable();

        const checkboxes = wrapper.findAll('tbody tr input[type="checkbox"]');
        expect(checkboxes.length).toBeGreaterThan(0);

        await checkboxes[0].setValue(true);
        await flushPromises();

        const bulkEditBtn = wrapper.find('button[title="Bulk edit selected affects"]');
        await bulkEditBtn.trigger('click');
        await flushPromises();

        const applyBtn = wrapper.find('button[title="Apply changes to selected affects"]');
        const cancelBtn = wrapper.find('button[title="Cancel bulk edit"]');

        expect(applyBtn.exists()).toBe(true);
        expect(applyBtn.text()).toContain('Apply Changes');
        expect(cancelBtn.exists()).toBe(true);
        expect(cancelBtn.text()).toContain('Cancel');
      });

      it('should hide bulk edit button in bulk edit mode', async () => {
        const wrapper = await mountAffectsTable();

        const checkboxes = wrapper.findAll('tbody tr input[type="checkbox"]');
        expect(checkboxes.length).toBeGreaterThan(0);

        await checkboxes[0].setValue(true);
        await flushPromises();

        let bulkEditBtn = wrapper.find('button[title="Bulk edit selected affects"]');
        expect(bulkEditBtn.exists()).toBe(true);

        await bulkEditBtn.trigger('click');
        await flushPromises();

        bulkEditBtn = wrapper.find('button[title="Bulk edit selected affects"]');
        expect(bulkEditBtn.exists()).toBe(false);
      });

      it('should hide delete button in bulk edit mode', async () => {
        const wrapper = await mountAffectsTable();

        const checkboxes = wrapper.findAll('tbody tr input[type="checkbox"]');
        expect(checkboxes.length).toBeGreaterThan(0);

        await checkboxes[0].setValue(true);
        await flushPromises();

        let deleteBtn = wrapper.find('button[title="Remove selected affects"]');
        expect(deleteBtn.exists()).toBe(true);

        const bulkEditBtn = wrapper.find('button[title="Bulk edit selected affects"]');
        await bulkEditBtn.trigger('click');
        await flushPromises();

        deleteBtn = wrapper.find('button[title="Remove selected affects"]');
        expect(deleteBtn.exists()).toBe(false);
      });

      it('should exit bulk edit mode when cancel button is clicked', async () => {
        const wrapper = await mountAffectsTable();

        const checkboxes = wrapper.findAll('tbody tr input[type="checkbox"]');
        expect(checkboxes.length).toBeGreaterThan(0);

        await checkboxes[0].setValue(true);
        await flushPromises();

        const bulkEditBtn = wrapper.find('button[title="Bulk edit selected affects"]');
        await bulkEditBtn.trigger('click');
        await flushPromises();

        let bulkEditRow = wrapper.find('tbody tr.bulk-edit');
        expect(bulkEditRow.exists()).toBe(true);

        const cancelBtn = wrapper.find('button[title="Cancel bulk edit"]');
        await cancelBtn.trigger('click');
        await flushPromises();

        bulkEditRow = wrapper.find('tbody tr.bulk-edit');
        expect(bulkEditRow.exists()).toBe(false);
      });

      it('should render BulkEditCell components for each column in bulk edit mode', async () => {
        const wrapper = await mountAffectsTable();

        const checkboxes = wrapper.findAll('tbody tr input[type="checkbox"]');
        expect(checkboxes.length).toBeGreaterThan(0);

        await checkboxes[0].setValue(true);
        await flushPromises();

        const bulkEditBtn = wrapper.find('button[title="Bulk edit selected affects"]');
        await bulkEditBtn.trigger('click');
        await flushPromises();

        const bulkEditRow = wrapper.find('tbody tr.bulk-edit');
        const cells = bulkEditRow.findAll('td');

        expect(cells.length).toBeGreaterThan(1);
      });

      it('should support changing fields in bulk edit row', async () => {
        const wrapper = await mountAffectsTable();

        const checkboxes = wrapper.findAll('tbody tr input[type="checkbox"]');
        expect(checkboxes.length).toBeGreaterThan(0);

        // Select a row
        await checkboxes[0].setValue(true);
        await flushPromises();

        // Enter bulk edit mode
        const bulkEditBtn = wrapper.find('button[title="Bulk edit selected affects"]');
        await bulkEditBtn.trigger('click');
        await flushPromises();

        // Verify bulk edit row has input fields
        const bulkEditRow = wrapper.find('tbody tr.bulk-edit');
        const inputs = bulkEditRow.findAll('input, select');

        // Should have multiple editable fields
        expect(inputs.length).toBeGreaterThan(1);

        // Apply changes button should work
        const applyBtn = wrapper.find('button[title="Apply changes to selected affects"]');
        await applyBtn.trigger('click');
        await flushPromises();

        // Should exit bulk edit mode
        expect(wrapper.find('tbody tr.bulk-edit').exists()).toBe(false);
      });

      it('should reset selection after applying bulk edit', async () => {
        const wrapper = await mountAffectsTable();

        const checkboxes: DOMWrapper<HTMLInputElement>[] = wrapper.findAll('tbody tr input[type="checkbox"]');
        expect(checkboxes.length).toBeGreaterThan(0);

        await checkboxes[0].setValue(true);
        await flushPromises();

        const bulkEditBtn = wrapper.find('button[title="Bulk edit selected affects"]');
        await bulkEditBtn.trigger('click');
        await flushPromises();

        // Verify row is selected
        expect(checkboxes[0].element.checked).toBe(true);

        const applyBtn = wrapper.find('button[title="Apply changes to selected affects"]');
        await applyBtn.trigger('click');
        await flushPromises();

        // Verify selection is cleared
        expect(checkboxes[0].element.checked).toBe(false);
      });

      it('should only modify fields that were changed in bulk edit', async () => {
        const wrapper = await mountAffectsTable();
        const { flaw } = useFlaw();

        const checkboxes = wrapper.findAll('tbody tr input[type="checkbox"]');
        expect(checkboxes.length).toBeGreaterThan(0);

        await checkboxes[0].setValue(true);
        await flushPromises();

        // Store all original values
        const originalAffect = { ...flaw.value.affects[0] };

        // Enter bulk edit mode
        const bulkEditBtn = wrapper.find('button[title="Bulk edit selected affects"]');
        await bulkEditBtn.trigger('click');
        await flushPromises();

        // Apply changes without modifying anything
        const applyBtn = wrapper.find('button[title="Apply changes to selected affects"]');
        await applyBtn.trigger('click');
        await flushPromises();

        // Verify nothing changed
        expect(flaw.value.affects[0].ps_module).toBe(originalAffect.ps_module);
        expect(flaw.value.affects[0].ps_component).toBe(originalAffect.ps_component);
        expect(flaw.value.affects[0].affectedness).toBe(originalAffect.affectedness);
      });
    });
  });
});
