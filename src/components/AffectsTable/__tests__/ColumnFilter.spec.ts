import { ref } from 'vue';

import { flushPromises, mount } from '@vue/test-utils';
import type { Column } from '@tanstack/vue-table';

import type { ZodAffectType } from '@/types';
import DropDownMenu from '@/widgets/DropDownMenu/DropDownMenu.vue';

import ColumnFilter from '../ColumnFilter.vue';

describe('columnFilter suggestions', () => {
  it('only reads faceted values while open and refreshes them on reopen', async () => {
    const values = ref(['first']);
    const getFacetedUniqueValues = vi.fn(() => new Map(values.value.map(value => [value, 1])));
    const column = {
      id: 'ps_component',
      columnDef: { meta: {} },
      getFilterValue: () => '',
      setFilterValue: vi.fn(),
      getFacetedUniqueValues,
    } as unknown as Column<ZodAffectType, unknown>;
    const wrapper = mount(ColumnFilter, { props: { column }, global: { stubs: { Teleport: true } } });
    const dropdown = wrapper.findComponent(DropDownMenu);
    expect(getFacetedUniqueValues).not.toHaveBeenCalled();

    await dropdown.find('.dropdown-trigger').trigger('click');
    await flushPromises();
    expect(wrapper.find('datalist option').attributes('value')).toBe('first');
    expect(getFacetedUniqueValues).toHaveBeenCalledTimes(1);
    await dropdown.find('.dropdown-trigger').trigger('click');
    await flushPromises();

    values.value = ['second'];
    await flushPromises();
    expect(getFacetedUniqueValues).toHaveBeenCalledTimes(1);
    await dropdown.find('.dropdown-trigger').trigger('click');
    await flushPromises();
    expect(wrapper.find('datalist option').attributes('value')).toBe('second');
    expect(getFacetedUniqueValues).toHaveBeenCalledTimes(2);
  });
});
