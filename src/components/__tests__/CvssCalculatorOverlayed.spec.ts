import sampleFlawFull from '@test-fixtures/sampleFlawFull.json';
import { mount } from '@vue/test-utils';
import { describe, it, expect } from 'vitest';

import CvssCalculatorOverlayed from '../CvssCalculator/CvssCalculatorOverlayed.vue';

describe('cvssCalculatorOverlayed', () => {
  afterEach(() => {
    vi.resetAllMocks();
    vi.resetModules();
  });

  it('mounts and renders correctly', () => {
    const wrapper = mount(CvssCalculatorOverlayed, {
      props: {
        affect: sampleFlawFull.affects[0],
      },
    });
    expect(wrapper.html()).toMatchSnapshot();
  });

  it('shows cvss calculator on click', async () => {
    const wrapper = mount(CvssCalculatorOverlayed, {
      props: {
        affect: sampleFlawFull.affects[0],
      },
    });

    await wrapper.trigger('click');

    expect(wrapper.html()).toMatchSnapshot();
  });
});
