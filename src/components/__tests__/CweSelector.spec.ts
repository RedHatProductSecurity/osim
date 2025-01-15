import { describe, it, beforeEach } from 'vitest';

import CweSelector from '@/components/CweSelector/CweSelector.vue';

import EditableTextWithSuggestions from '@/widgets/EditableTextWithSuggestions/EditableTextWithSuggestions.vue';
import LabelDiv from '@/widgets/LabelDiv/LabelDiv.vue';
import { mountWithConfig } from '@/__tests__/helpers';

describe('cweSelector.vue', () => {
  let wrapper: any;

  beforeEach(() => {
    wrapper = mountWithConfig(CweSelector, {
      global: {
        components: {
          EditableTextWithSuggestions,
          LabelDiv,
        },
      },
    });
  });

  it('renders correctly', () => {
    expect(wrapper.exists()).toBe(true);
    expect(wrapper.html()).toMatchSnapshot();
  });

  it('loads data from localStorage', () => {
    const data = JSON.stringify([{ id: '123', name: 'Test CWE' }]);
    localStorage.setItem('CWE:API-DATA', data);
    wrapper.vm.loadCweData();
    expect(wrapper.vm.cweData).toEqual([{ id: '123', name: 'Test CWE' }]);
  });

  it('filters suggestions correctly', async () => {
    wrapper.vm.cweData = [{ id: '123', name: 'Test CWE' }, { id: '456', name: 'Another CWE' }];
    await wrapper.vm.filterSuggestions('123');
    expect(wrapper.vm.suggestions).toEqual([{ id: '123', name: 'Test CWE' }]);
  });

  it('updates model value correctly on suggestion click', async () => {
    const fn = vi.fn();
    wrapper.vm.queryRef = 'CWE-';
    await wrapper.vm.handleSuggestionClick(fn, 'CWE-123');
    expect(wrapper.vm.modelValue).toBe('CWE-123');
    expect(wrapper.vm.queryRef).toBe('CWE-123');
    expect(wrapper.vm.suggestions).toEqual([]);
  });
});
