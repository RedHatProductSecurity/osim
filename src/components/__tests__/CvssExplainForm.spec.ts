import { mount } from '@vue/test-utils';
import { sampleFlaw } from './SampleData';
import CvssExplainForm from '../CvssExplainForm.vue';

describe('CVSS Explain Form', () => {
  it('renders correctly', () => {
    const flaw = sampleFlaw();
    const wrapper = mount(CvssExplainForm, {
      props: {
        modelValue: flaw
      },
    });

    const label = wrapper.find('.cvss-score-mismatch');
    const textarea = wrapper.find('textarea');

    expect(label.exists()).toBe(true);
    expect(label.text()).toBe('Explain non-obvious CVSSv3 score metrics');
    expect(textarea.exists()).toBe(true);
  });

  it('syncs modelValue with textarea', async () => {
    const flaw = sampleFlaw();
    flaw.cvss_scores[0].comment = 'some text';

    const wrapper = mount(CvssExplainForm, {
      props: {
        modelValue: flaw
      },
    });

    const textarea = wrapper.find('textarea');
    expect(textarea.element.value).toBe('some text');

    await textarea.setValue('some other text');
    expect(flaw.cvss_scores[0].comment).toBe('some other text');
  });
});
