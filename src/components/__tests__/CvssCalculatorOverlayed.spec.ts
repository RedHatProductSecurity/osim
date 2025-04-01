import { ref, type Component, watch } from 'vue';

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

describe('cvssCalculatorOverlayed', () => {
  type Subject = VueWrapper<Component>;
  let subject: Subject;
  beforeEach(async () => {
    if (subject) subject.unmount();
    const { validateCvssVector: _validateCvssVector } = await importActual('@/composables/useCvssScores');

    const cvssVector = ref<null | string>('');
    const cvssScore = ref<null | number>(0);
    const cvssVersion = ref('V3');

    watch(cvssVector, (newValue) => {
      if (newValue) {
        subject.setProps({ cvssVector: newValue });
      }
    });
    function updateVector(value: null | string) {
      cvssVector.value = value;
    }
    function updateScore(value: null | number) {
      cvssScore.value = value;
    }
    vi.mocked(useCvssScores).mockReturnValue({
      cvssVector,
      cvssScore,
      cvssVersion,
      updateVector,
      updateScore,
    } as ReturnType<typeof useCvssScores>);
    vi.mocked(validateCvssVector).mockImplementation(_validateCvssVector);

    const importedComponent = await import('@/components/CvssCalculator/CvssCalculatorOverlayed.vue');
    const CvssCalculatorOverlayed = importedComponent.default;
    subject = mount(CvssCalculatorOverlayed, {
      props: {
        'affect': sampleFlawFull.affects[0],
        'cvssScore': null,
        'onUpdate:cvssScore': (e: any) => subject.setProps({ cvssScore: e }),
        'cvssVector': '',
        'onUpdate:cvssVector': (e: any) => {
          subject.setProps({ cvssVector: e });
        },
      },
    });
  });

  afterEach(() => {
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
    expect(inputVectorValue.classes().includes('is-p')).toBe(false);
  });

  it('shows validation on incomplete vector', async () => {
    const inputVectorValue = subject.find('.vector-input');
    await activateFactorButton(subject, 'Availability', 'High');
    expect(inputVectorValue.classes().includes('is-invalid')).toBe(true);
  });
});
