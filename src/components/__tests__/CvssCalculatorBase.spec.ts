import { type Component } from 'vue';

import sampleFlawFull from '@test-fixtures/sampleFlawFull.json';
import { VueWrapper, mount } from '@vue/test-utils';
import { describe, it, expect } from 'vitest';

import { useCvssScores, validateCvssVector } from '@/composables/useCvssScores';

import { importActual } from '@/__tests__/helpers';

vi.mock('@/composables/useCvssScores');

async function activateFactorButton(subject: any, factor: string, value: string) {
  const factorButtonGroup = subject.findAll('.btn-group-vertical')
    .filter((node: { text: () => string | string[] }) => node.text().includes(factor))[0];
  const factorButton = factorButtonGroup
    .findAll('.btn')
    .filter((node: { text: () => string }) => node.text() === value)[0];
  await factorButton.trigger('click');
}

async function activateMultipleFactorButtons(subject: any, factorValuePairs: [string, string][]) {
  for (const [factor, value] of factorValuePairs) {
    await activateFactorButton(subject, factor, value);
  }
}

describe('cvssCalculatorBase', () => {
  type Subject = VueWrapper<Component>;
  let subject: Subject;
  beforeEach(async () => {
    const {
      useCvssScores: _useCvssScores,
      validateCvssVector: _validateCvssVector,
    } = await importActual('@/composables/useCvssScores');
    vi.mocked(useCvssScores).mockImplementation(_useCvssScores);
    vi.mocked(validateCvssVector).mockImplementation(_validateCvssVector);

    const importedComponent = await import('@/components/CvssCalculator/CvssCalculatorBase.vue');
    const CvssCalculatorBase = importedComponent.default;
    subject = mount(CvssCalculatorBase, {
      props: {
        cvssEntity: sampleFlawFull.affects[0],
      },
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
    vi.resetModules();
    subject?.unmount();
  });

  it('mounts and renders correctly', async () => {
    expect(subject.html()).toMatchSnapshot();
  });

  // Validations
  it('doesn\'t show validation on empty vector', async () => {
    await subject.trigger('click');
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
    await subject.trigger('click');
    await activateMultipleFactorButtons(subject, factorValuePairs);
    const inputVectorValue = subject.find('.vector-input');
    expect(inputVectorValue.classes().includes('is-p')).toBe(false);
  });

  it('shows validation on incomplete vector', async () => {
    await subject.trigger('click');

    const inputVectorValue = subject.find('.vector-input');
    await activateFactorButton(subject, 'Availability', 'High');
    expect(inputVectorValue.classes().includes('is-invalid')).toBe(true);
  });
});
