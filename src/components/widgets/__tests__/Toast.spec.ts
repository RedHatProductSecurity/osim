import { mount, flushPromises } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';

import Toast, { type ToastProps } from '../Toast.vue';
import { DateTime } from 'luxon';

describe('Toast', () => {
  const mountToast = (props?: Partial<ToastProps>) => {
    return mount(Toast, {
      props: {
        timestamp: DateTime.fromISO('2024-08-28T10:10:10.000Z'),
        body: 'Test body',
        ...props,
      },
      global: {
        plugins: [createTestingPinia()]
      }
    });
  };

  beforeEach(() => {
    vi.useFakeTimers({
      now: new Date('2024-08-28T11:10:10.000Z').getTime(),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });


  it.each<{ title: string, body: string, css: ToastProps['css'] }>([
    { title: 'Success', body: 'Test body', css: 'success' },
    { title: 'Error', body: 'Test body', css: 'danger' },
    { title: 'Warn', body: 'Test body', css: 'warning' },
    { title: 'Default', body: 'Test body', css: undefined },
  ])('Should render component with title $title, body $body and $css style', ({ title, body, css }) => {
    const wrapper = mountToast({ title, body, css });

    expect(wrapper.html()).toMatchSnapshot();
  });

  it('Should close toast when close button is clicked', async () => {
    const wrapper = mountToast();

    await wrapper.find('.btn-close').trigger('click');

    expect(wrapper.emitted('close')).toBeTruthy();
  });

  it('Should close toast after timeoutMs', async () => {
    const wrapper = mountToast({ timeoutMs: 500 });

    vi.advanceTimersByTime(1000);
    await flushPromises();

    expect(wrapper.emitted('close')).toBeTruthy();
    expect(wrapper.emitted('stale')).toBeFalsy();
  });

  it('Should emit stale event after freshMs', async () => {
    const wrapper = mountToast({ timeoutMs: 50000 });

    vi.advanceTimersByTime(11000);
    await flushPromises();

    expect(wrapper.emitted('close')).toBeFalsy();
    expect(wrapper.emitted('stale')).toBeTruthy();
  });
});
