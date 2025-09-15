import { flushPromises, mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';

import { useFlaw } from '@/composables/useFlaw';

import SampleFlawFullV2 from '@/__tests__/__fixtures__/sampleFlawFullV2.json';
import type { ZodFlawType } from '@/types';
import { useSettingsStore } from '@/stores/SettingsStore';

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

    flaw.value = SampleFlawFullV2 as unknown as ZodFlawType;
    vi.useFakeTimers();
  });

  it('should render', async () => {
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
        expect(initialRowCount).toBeGreaterThan(0);
        expect(filteredRowCount).toBe(0);

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

        const checkboxes = wrapper.findAll('.dropdown-menu input[type="checkbox"]');
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
    });
  });
});
