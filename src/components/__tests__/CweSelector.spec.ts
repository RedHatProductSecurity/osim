import { describe, it, beforeEach } from 'vitest';
import { flushPromises, type VueWrapper } from '@vue/test-utils';

import CweSelector from '@/components/CweSelector/CweSelector.vue';

import { mountWithConfig } from '@/__tests__/helpers';
import { DATA_KEY } from '@/services/CweService';

describe('cweSelector.vue', () => {
  let wrapper: VueWrapper<any>;

  beforeEach(() => {
    wrapper = mountWithConfig(CweSelector);
    vi.useFakeTimers();
  });

  it('renders correctly', () => {
    expect(wrapper.exists()).toBe(true);
    expect(wrapper.html()).toMatchSnapshot();
  });

  it('loads CWE data on component mount', async () => {
    const data = JSON.stringify([{ id: '123', name: 'Test CWE', status: 'Draft', summary: '', usage: '' }]);
    localStorage.setItem(DATA_KEY, data);
    wrapper = mountWithConfig(CweSelector);
    expect(wrapper.vm.cweData).toEqual([{ id: '123', name: 'Test CWE', status: 'Draft', summary: '', usage: '' }]);
  });

  it('filters suggestions correctly and updates model on suggestion click', async () => {
    wrapper.vm.cweData = [
      { id: '123', name: 'Test CWE', status: 'Draft', summary: '', usage: '' },
      { id: '456', name: 'Another CWE', status: 'Draft', summary: '', usage: '' },
    ];
    const input = wrapper.find('input');
    await input.setValue('123');

    vi.runAllTimers();
    await flushPromises();
    expect(wrapper.text()).toContain('CWE-123');

    const suggestionRow = wrapper.findAll('.dropdown-menu .item');
    await suggestionRow[0].trigger('click');
    expect(wrapper.vm.modelValue).toBe('CWE-123');
    expect(wrapper.vm.queryRef).toBe('CWE-123');
    expect(wrapper.vm.suggestions).toEqual([]);
  });

  it('replaces existing CWE value when selecting a new suggestion (single CWE only)', async () => {
    wrapper.vm.cweData = [
      { id: '79', name: 'XSS', status: 'Stable', summary: '', usage: 'Allowed' },
      { id: '89', name: 'SQL Injection', status: 'Stable', summary: '', usage: 'Allowed' },
    ];

    // Set initial CWE value
    wrapper.vm.modelValue = 'CWE-79';
    await flushPromises();

    // User types to search for another CWE
    const input = wrapper.find('input');
    await input.setValue('89');

    vi.runAllTimers();
    await flushPromises();

    // Click on the second CWE suggestion
    const suggestionRow = wrapper.findAll('.dropdown-menu .item');
    await suggestionRow[0].trigger('click');

    // The entire value should be replaced (not appended)
    expect(wrapper.vm.modelValue).toBe('CWE-89');
    expect(wrapper.vm.modelValue).not.toContain('CWE-79');
  });
});
