import { mount } from '@vue/test-utils';

import { osimFullFlawTest } from './test-suite-helpers';
import CvssExplainForm from '../CvssExplainForm.vue';

describe('cVSS Explain Form', () => {
  osimFullFlawTest('renders correctly', ({ flaw }) => {
    const wrapper = mount(CvssExplainForm, {
      props: {
        modelValue: flaw,
      },
    });

    const label = wrapper.find('.cvss-score-mismatch');
    const textarea = wrapper.find('textarea');

    expect(label.exists()).toBe(true);
    expect(label.text()).toBe('Explain non-obvious CVSSv3 score metrics');
    expect(textarea.exists()).toBe(true);
  });

  osimFullFlawTest('syncs modelValue with textarea', async ({ flaw }) => {
    flaw.cvss_scores[0].comment = 'some text';

    const wrapper = mount(CvssExplainForm, {
      props: {
        modelValue: flaw,
      },
    });

    const textarea = wrapper.find('textarea');
    expect(textarea.element.value).toBe('some text');

    await textarea.setValue('some other text');
    expect(flaw.cvss_scores[0].comment).toBe('some other text');
  });
});
