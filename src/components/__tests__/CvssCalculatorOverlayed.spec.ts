import { mount } from '@vue/test-utils';
import { describe, it, expect } from 'vitest';

import CvssCalculatorOverlayed from '../CvssCalculator/CvssCalculatorOverlayed.vue';

function activateFactorButton(subject: any, factor: string, value: string) {
  const factorButtonGroup = subject.findAll('.btn-group-vertical')
    .filter((node: { text: () => string | string[] }) => node.text().includes(factor))[0];
  const factorButton = factorButtonGroup
    .findAll('.btn')
    .filter((node: { text: () => string }) => node.text() === value)[0];
  factorButton.trigger('click');
}

function activateMultipleFactorButtons(subject: any, factorValuePairs: [string, string][]) {
  for (const [factor, value] of factorValuePairs) {
    activateFactorButton(subject, factor, value);
  }
}

describe('cvssCalculatorOverlayed', () => {
  let subject: any;

  beforeEach(() => {
    subject = mount(CvssCalculatorOverlayed, {
      props: {
        'cvssScore': null,
        'onUpdate:cvssScore': (e: any) => subject.setProps({ cvssScore: e }),
        'cvssVector': '',
        'onUpdate:cvssVector': (e: any) => subject.setProps({ cvssVector: e }),
      },
    });
  });

  it('mounts and renders correctly', async () => {
    await subject.find('.vector-input').trigger('focus');
    expect(subject.html()).toMatchSnapshot();
  });

  it('shows calculator on input focus', async () => {
    await subject.find('.vector-input').trigger('focus');
    expect(subject.find('.cvss-calculator').classes('visually-hidden')).toBe(false);
  });

  it('hides calculator on input blur', async () => {
    await subject.find('.vector-input');
    expect(subject.find('.cvss-calculator').classes('visually-hidden')).toBe(true);
  });

  // Validations
  it('doesn\'t show validation on empty vector', async () => {
    const inputVectorValue = subject.find('.vector-input');
    expect(inputVectorValue.classes().includes('is-invalid')).toBe(false);
  });

  it('doesn\'t show validation on complete vector', async () => {
    const factorValuePairs: [string, string][] = [
      ['Attack Vector', 'Network'],
      ['Attack Complexity', 'Low'],
      ['Privileges Required', 'None'],
      ['User Interaction', 'None'],
      ['Scope', 'Changed'],
      ['Confidentiality', 'High'],
      ['Integrity', 'High'],
      ['Availability', 'High'],
    ];
    await activateMultipleFactorButtons(subject, factorValuePairs);
    const inputVectorValue = subject.find('.vector-input');
    expect(inputVectorValue.classes().includes('is-invalid')).toBe(false);
  });

  it('shows validation on incomplete vector', async () => {
    const factorValuePairs: [string, string][] = [
      ['Availability', 'High'],
    ];
    await activateMultipleFactorButtons(subject, factorValuePairs);
    const inputVectorValue = subject.find('.vector-input');
    expect(inputVectorValue.classes().includes('is-invalid')).toBe(true);
  });
});
