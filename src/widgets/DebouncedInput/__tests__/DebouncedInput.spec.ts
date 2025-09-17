import { mount } from '@vue/test-utils';

import DebouncedInput from '@/widgets/DebouncedInput/DebouncedInput.vue';

describe('debouncedInput', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders correctly with initial value', () => {
    const wrapper = mount(DebouncedInput, {
      props: { modelValue: 'Initial value' },
    });

    const input = wrapper.find('input');
    expect(input.element.value).toBe('Initial value');
  });

  it('renders correctly with number value', () => {
    const wrapper = mount(DebouncedInput, {
      props: { modelValue: 42 },
    });

    const input = wrapper.find('input');
    expect(input.element.value).toBe('42');
  });

  it('debounces input changes with default delay', async () => {
    const wrapper = mount(DebouncedInput, {
      props: { modelValue: '' },
    });

    const input = wrapper.find('input');
    await input.setValue('test');

    // Should not emit immediately
    expect(wrapper.emitted()['update:modelValue']).toBeUndefined();

    // Advance timers by default debounce time (250ms)
    vi.advanceTimersByTime(250);

    // Should emit after debounce delay
    expect(wrapper.emitted()['update:modelValue']).toHaveLength(1);
    expect(wrapper.emitted()['update:modelValue'][0]).toEqual(['test']);
  });

  it('debounces input changes with custom delay', async () => {
    const wrapper = mount(DebouncedInput, {
      props: {
        modelValue: '',
        debounce: 500,
      },
    });

    const input = wrapper.find('input');
    await input.setValue('test');

    // Should not emit immediately
    expect(wrapper.emitted()['update:modelValue']).toBeUndefined();

    // Should not emit after default delay (250ms)
    vi.advanceTimersByTime(250);
    expect(wrapper.emitted()['update:modelValue']).toBeUndefined();

    // Should emit after custom delay (500ms)
    vi.advanceTimersByTime(250);
    expect(wrapper.emitted()['update:modelValue']).toHaveLength(1);
    expect(wrapper.emitted()['update:modelValue'][0]).toEqual(['test']);
  });

  it('cancels previous timeout when input changes rapidly', async () => {
    const wrapper = mount(DebouncedInput, {
      props: { modelValue: '' },
    });

    const input = wrapper.find('input');

    // First input change
    await input.setValue('a');
    vi.advanceTimersByTime(100);

    // Second input change before debounce completes
    await input.setValue('ab');
    vi.advanceTimersByTime(100);

    // Third input change before debounce completes
    await input.setValue('abc');

    // Should not have emitted yet
    expect(wrapper.emitted()['update:modelValue']).toBeUndefined();

    // Complete the debounce delay for the last change
    vi.advanceTimersByTime(250);

    // Should only emit once with the final value
    expect(wrapper.emitted()['update:modelValue']).toHaveLength(1);
    expect(wrapper.emitted()['update:modelValue'][0]).toEqual(['abc']);
  });

  it('clears timeout on component unmount', () => {
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

    const wrapper = mount(DebouncedInput, {
      props: { modelValue: 'test' },
    });

    const input = wrapper.find('input');
    input.setValue('new value');

    wrapper.unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();

    clearTimeoutSpy.mockRestore();
  });

  it('handles empty string input', async () => {
    const wrapper = mount(DebouncedInput, {
      props: { modelValue: 'initial' },
    });

    const input = wrapper.find('input');
    await input.setValue('');

    vi.advanceTimersByTime(250);

    expect(wrapper.emitted()['update:modelValue']).toHaveLength(1);
    expect(wrapper.emitted()['update:modelValue'][0]).toEqual(['']);
  });

  it('handles numeric input values', async () => {
    const wrapper = mount(DebouncedInput, {
      props: { modelValue: 0 },
    });

    const input = wrapper.find('input');
    await input.setValue('123');

    vi.advanceTimersByTime(250);

    expect(wrapper.emitted()['update:modelValue']).toHaveLength(1);
    expect(wrapper.emitted()['update:modelValue'][0]).toEqual(['123']);
  });

  it('updates input value when modelValue prop changes', async () => {
    const wrapper = mount(DebouncedInput, {
      props: { modelValue: 'initial' },
    });

    const input = wrapper.find('input');
    expect(input.element.value).toBe('initial');

    await wrapper.setProps({ modelValue: 'updated' });

    expect(input.element.value).toBe('updated');
  });

  it('does not emit when modelValue prop changes externally', async () => {
    const wrapper = mount(DebouncedInput, {
      props: { modelValue: 'initial' },
    });

    await wrapper.setProps({ modelValue: 'external update' });

    vi.advanceTimersByTime(250);

    expect(wrapper.emitted()['update:modelValue']).toBeUndefined();
  });
});
