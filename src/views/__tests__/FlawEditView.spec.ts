import { flushPromises } from '@vue/test-utils';

import sampleFlawRequired from '@/components/__tests__/__fixtures__/sampleFlawRequired.json';

import { mountWithConfig } from '@/__tests__/helpers';
import { getFlaw } from '@/services/FlawService';

import FlawEditView from '../FlawEditView.vue';

vi.mock('@/services/FlawService', async (importOriginal) => {
  return ({
    ...await importOriginal<typeof import('@/services/FlawService')>(),
    getFlaw: vi.fn().mockResolvedValue(sampleFlawRequired),
  });
});

vi.mock('@/components/FlawForm.vue');

const mountFlawEditView = () => mountWithConfig(FlawEditView, {
  props: {
    id: 'some_fake_uuid',
  },
  shallow: true,
});

describe('flawEditView', () => {
  it('should render loading icon', () => {
    const wrapper = mountFlawEditView();
    expect(wrapper.html()).toMatchSnapshot();
  });

  it('should render flaw edit form', async () => {
    const wrapper = mountFlawEditView();

    await flushPromises();

    expect(wrapper.html()).toMatchSnapshot();
  });

  it('should call `getFlaw` when mounted', () => {
    mountFlawEditView();

    expect(getFlaw).toHaveBeenNthCalledWith(1, 'some_fake_uuid');
  });

  it('should call `getFlaw` when `id` prop changes', async () => {
    const wrapper = mountFlawEditView();

    await flushPromises();

    wrapper.setProps({
      id: '2',
    });

    await flushPromises();

    expect(getFlaw).toHaveBeenNthCalledWith(2, '2');
  });

  it('should render error message when `getFlaw` fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(getFlaw).mockRejectedValue(new Error('Failed to fetch flaw'));

    const wrapper = mountFlawEditView();

    await flushPromises();

    expect(wrapper.html()).toMatchSnapshot();
  });
});
