import { type ExtractPublicPropTypes } from 'vue';

import { mount, flushPromises } from '@vue/test-utils';
import { describe, it, expect, vi } from 'vitest';
import { useRouter } from 'vue-router';
// @ts-expect-error missing types
import DjangoQLCompletion from 'djangoql-completion';

describe('issueSearchAdvanced', () => {
  let IssueSearchAdvanced: typeof import('@/components/IssueSearchAdvanced.vue').default;

  vi.mock('djangoql-completion');
  vi.mock('vue-router', () => ({
    useRoute: vi.fn().mockReturnValue({
      query: {},
    }),
    useRouter: vi.fn().mockReturnValue({
      replace: vi.fn(),
    }),
  }));

  const mountIssueSearchAdvanced = async (props?: ExtractPublicPropTypes<typeof IssueSearchAdvanced>) => {
    const wrapper = mount(IssueSearchAdvanced, {
      props: {
        isLoading: false,
        ...props,
      },
    });
    await flushPromises();
    return wrapper;
  };

  beforeEach(async () => {
    IssueSearchAdvanced = (await import('@/components/IssueSearchAdvanced.vue')).default;
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it.each([true, false])('should render when `isLoading` is %s', async (isLoading) => {
    const wrapper = await mountIssueSearchAdvanced({ isLoading });

    expect(wrapper.html()).toMatchSnapshot();
    expect(wrapper.find('summary').text()).toEqual('Advanced Search');
    expect(wrapper.find('form').isVisible).toBeTruthy();
  });

  it('should instantiate djangoql-completion on mount', async () => {
    await mountIssueSearchAdvanced();

    expect(vi.mocked(DjangoQLCompletion)).toHaveBeenCalledTimes(1);
  });

  it('should show modal when query label is clicked', async () => {
    const wrapper = await mountIssueSearchAdvanced();
    await wrapper.find('[aria-label="hide query filter"]').trigger('click');

    expect(wrapper.find('.modal').isVisible()).toBeTruthy();
    expect(wrapper.find('h1').text()).toEqual('Query Filter Guide');
  });

  it('should update query params when form is submitted', async () => {
    const wrapper = await mountIssueSearchAdvanced();
    const router = vi.mocked(useRouter());

    await wrapper.find('textarea').setValue('djangoql query');
    await wrapper.find('form').trigger('submit');

    expect(router.replace).toHaveBeenNthCalledWith(1, { query: { query: 'djangoql query' } });
  });

  it('should set facets when populated', async () => {
    const wrapper = await mountIssueSearchAdvanced();
    const router = vi.mocked(useRouter());

    await wrapper.find('select').setValue('cve_description');
    await wrapper.find('.input-group input').setValue('some value');
    await wrapper.findAll('select').at(1)!.setValue('impact');
    await wrapper.find('select+select').setValue('CRITICAL');
    await wrapper.find('form').trigger('submit');

    expect(router.replace).toHaveBeenNthCalledWith(1, { query: { cve_description: 'some value', impact: 'CRITICAL' } });
  });

  it('should add new facet when last facet is populated', async () => {
    const wrapper = await mountIssueSearchAdvanced();

    await wrapper.find('select').setValue('cve_description');
    await wrapper.find('.input-group input').setValue('some value');

    expect(wrapper.findAll('select').length).toEqual(3);
    expect(wrapper.html()).toMatchSnapshot();
  });

  it('should search for nonempty cve description', async () => {
    const wrapper = await mountIssueSearchAdvanced();
    const router = vi.mocked(useRouter());

    await wrapper.find('select').setValue('cve_description');
    await wrapper.findAll('.input-group .btn-group .btn')[1].trigger('click');
    await wrapper.find('form').trigger('submit');

    expect(router.replace).toHaveBeenNthCalledWith(1, { query: { cve_description: 'nonempty' } });
  });

  it('should save search as default', async () => {
    const wrapper = await mountIssueSearchAdvanced();

    await wrapper.find('select').setValue('cve_description');
    await wrapper.find('.input-group input').setValue('some value');
    await wrapper.find('button[aria-label="Save filters as default"]').trigger('click');

    expect(wrapper.emitted()).toHaveProperty('filter:save');
  });
});
