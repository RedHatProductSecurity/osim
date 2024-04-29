import { mount, VueWrapper, flushPromises } from '@vue/test-utils';
import { describe, it, expect, vi } from 'vitest';
import { useRoute, useRouter } from 'vue-router';
import IssueSearchAdvanced from '@/components/IssueSearchAdvanced.vue';

vi.mock('vue-router', async () => {
  const actual = await vi.importActual('vue-router');
  const replaceMock = vi.fn();
  
  return {
    ...actual,
    useRoute: vi.fn(() => ({ query: { mode: 'advanced', query: 'search' } })),
    useRouter: vi.fn(() => ({
      replace: replaceMock
    }))
  };
});


describe('IssueSearchAdvanced', () => {
  let wrapper: VueWrapper<any>;

  beforeEach(() => {
    const props: typeof IssueSearchAdvanced.props = { isLoading: false };
    wrapper = mount(IssueSearchAdvanced, {
      props,
      global: {
        mocks: { useRoute, useRouter },
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

  it('should update router with filters on search button click', async () => {
    const selectDropdown = wrapper.find('select.form-select.search-facet-field');
    await selectDropdown.setValue(selectDropdown.findAll('option')[1].element.value);
    await selectDropdown.trigger('change');
    const inputField = wrapper.find('input.form-control');
    await inputField.setValue('test'); 
    const searchButton = wrapper.find('button[type="submit"]');
    expect(searchButton.exists()).toBeTruthy();
    await searchButton.trigger('submit');
    await flushPromises();
    expect(useRouter().replace).toHaveBeenCalled();
    expect(useRouter().replace.mock.calls[0][0])
      .toStrictEqual({ query: { query: 'search', acknowledgments__name: 'test' } });
  });

  it('shouldn\'t render duplicate options on dropdown', () => {
    const selectDropdown = wrapper.find('select.form-select.search-facet-field');
    const allOptionsEL = selectDropdown.findAll('option');
    expect(allOptionsEL.length).toBe(21);
    const allValues = allOptionsEL.map(item => item.element.value);
    const uniqueValues = [...new Set(allValues)];
    expect(allValues).toStrictEqual(uniqueValues);
  });
});
