import { mount, VueWrapper, flushPromises } from '@vue/test-utils';
import { describe, it, expect, vi, type Mock } from 'vitest';
import { useRoute } from 'vue-router';
import IssueSearchAdvanced from '@/components/IssueSearchAdvanced.vue';

vi.mock('vue-router', async () => {
  const actual = await vi.importActual('vue-router');
  return {
    // eslint-disable-next-line @typescript-eslint/ban-types
    ...actual as {},
    useRoute: vi.fn(),
  };
});

(useRoute as Mock).mockReturnValue({
  'query': { mode: 'advanced' },
});

describe('IssueSearchAdvanced', () => {
  let wrapper: VueWrapper<any>;

  beforeEach(() => {
    const props: typeof IssueSearchAdvanced.props = { isLoading: false };
    wrapper = mount(IssueSearchAdvanced, {
      props,
      global: {
        mocks: { useRoute },
      }
    });
  });

  it('should render', () => {
    expect(wrapper.exists()).toBe(true);
  });

  it('should show advanced search', async () => {
    const content = wrapper.find('details');
    expect(content.exists()).toBe(true);
  });

  it('should emit on search button click', async () => {
    const searchButton = wrapper.find('button[type="submit"]');
    expect(searchButton.exists()).toBeTruthy();
    await searchButton.trigger('submit');
    await flushPromises();
    const setFilterEvent = wrapper.emitted('set:filters');
    expect(setFilterEvent[0][0]).toEqual({});
  });

  it('should emit with filters on search button click', async () => {
    const selectDropdown = wrapper.find('select.form-select.search-facet-field');
    await selectDropdown.setValue(selectDropdown.findAll('option')[1].element.value);
    await selectDropdown.trigger('change');
    const inputField = wrapper.find('input.form-control');
    await inputField.setValue('test'); 
    const searchButton = wrapper.find('button[type="submit"]');
    expect(searchButton.exists()).toBeTruthy();
    await searchButton.trigger('submit');
    await flushPromises();
    const setFilterEvent = wrapper.emitted('set:filters');
    expect(setFilterEvent[0][0]).toEqual({ acknowledgments__name: 'test' });
  });
});
