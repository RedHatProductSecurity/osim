import { ref } from 'vue';

import { mount } from '@vue/test-utils';
import { describe, it, expect } from 'vitest';

import CvssCalculator from '@/components/CvssCalculator/CvssCalculator.vue';

import { useCvssScores, validateCvssVector } from '@/composables/useCvssScores';

import { importActual } from '@/__tests__/helpers';

vi.mock('@/composables/useCvssScores');

async function activateFactorButton(subject: any, factor: string, value: string) {
  const factorButtonGroup = subject.findAll('.btn-group-vertical')
    .filter((node: { text: () => string | string[] }) => node.text().includes(factor))[0];
  const factorButton = factorButtonGroup
    .findAll('.btn')
    .find((node: { text: () => string }) => node.text() === value);
  await factorButton.trigger('click');
}

async function activateMultipleFactorButtons(subject: any, factorValuePairs: [string, string][]) {
  for (const [factor, value] of factorValuePairs) {
    await activateFactorButton(subject, factor, value);
  }
}

describe('cvssCalculator', () => {
  let subject: any;

  beforeEach(async () => {
    if (subject) subject.unmount();
    const { validateCvssVector: _validateCvssVector } = await importActual('@/composables/useCvssScores');

    const cvssVector = ref<null | string>('');
    const cvssScore = ref<null | number>(0);
    const cvssVersion = ref('V3');
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
    subject = mount(CvssCalculator, { error: null });
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

  // Score Calculation Test Cases
  // Critical score
  it('calculates critical score correctly', async () => {
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
    await subject.vm.$nextTick();
    const inputVectorValue = subject.find('.vector-input.form-control');
    expect(inputVectorValue.text()).toBe('10 CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H');
  });

  // High score
  it('calculates high score correctly', async () => {
    const factorValuePairs: [string, string][] = [
      ['Attack Vector', 'Adjacent'],
      ['Attack Complexity', 'High'],
      ['Privileges Required', 'Low'],
      ['User Interaction', 'Required'],
      ['Scope', 'Changed'],
      ['Confidentiality', 'Low'],
      ['Integrity', 'High'],
      ['Availability', 'High'],
    ];
    await activateMultipleFactorButtons(subject, factorValuePairs);
    const inputVectorValue = subject.find('.vector-input');
    expect(inputVectorValue.text()).toBe('7.5 CVSS:3.1/AV:A/AC:H/PR:L/UI:R/S:C/C:L/I:H/A:H');
  });

  // Medium score
  it('calculates medium score correctly', async () => {
    const factorValuePairs: [string, string][] = [
      ['Attack Vector', 'Adjacent'],
      ['Attack Complexity', 'High'],
      ['Privileges Required', 'Low'],
      ['User Interaction', 'Required'],
      ['Scope', 'Unchanged'],
      ['Confidentiality', 'Low'],
      ['Integrity', 'Low'],
      ['Availability', 'Low'],
    ];
    await activateMultipleFactorButtons(subject, factorValuePairs);
    const inputVectorValue = subject.find('.vector-input');
    expect(inputVectorValue.text()).toBe('4.3 CVSS:3.1/AV:A/AC:H/PR:L/UI:R/S:U/C:L/I:L/A:L');
  });

  // Low score
  it('calculates low score correctly', async () => {
    const factorValuePairs: [string, string][] = [
      ['Attack Vector', 'Local'],
      ['Attack Complexity', 'High'],
      ['Privileges Required', 'High'],
      ['User Interaction', 'Required'],
      ['Scope', 'Unchanged'],
      ['Confidentiality', 'None'],
      ['Integrity', 'Low'],
      ['Availability', 'Low'],
    ];
    await activateMultipleFactorButtons(subject, factorValuePairs);
    const inputVectorValue = subject.find('.vector-input');
    expect(inputVectorValue.text()).toBe('2.9 CVSS:3.1/AV:L/AC:H/PR:H/UI:R/S:U/C:N/I:L/A:L');
  });

  // Zero score
  it('calculates zero score correctly', async () => {
    const factorValuePairs: [string, string][] = [
      ['Attack Vector', 'Physical'],
      ['Attack Complexity', 'High'],
      ['Privileges Required', 'High'],
      ['User Interaction', 'Required'],
      ['Scope', 'Unchanged'],
      ['Confidentiality', 'None'],
      ['Integrity', 'None'],
      ['Availability', 'None'],
    ];
    await activateMultipleFactorButtons(subject, factorValuePairs);
    const inputVectorValue = subject.find('.vector-input');
    expect(inputVectorValue.text()).toBe('0 CVSS:3.1/AV:P/AC:H/PR:H/UI:R/S:U/C:N/I:N/A:N');
  });

  // Calculator Buttons Test Cases
  // Attack Vector
  // Network button
  it('attack vector\'s network button updates vector input field correctly', async () => {
    await activateFactorButton(subject, 'Attack Vector', 'Network');
    const inputVectorValue = subject.find('.vector-input');
    expect(inputVectorValue.text()).toContain('AV:N');
    // Reactivating button
    await activateFactorButton(subject, 'Attack Vector', 'Network');
    expect(inputVectorValue.text().includes('AV:N')).toBe(false);
  });

  // Adjacent button
  it('attack vector\'s adjacent button updates vector input field correctly', async () => {
    await activateFactorButton(subject, 'Attack Vector', 'Adjacent');
    const inputVectorValue = subject.find('.vector-input');
    expect(inputVectorValue.text()).toContain('AV:A');
    // Reactivating button
    await activateFactorButton(subject, 'Attack Vector', 'Adjacent');
    expect(inputVectorValue.text().includes('AV:A')).toBe(false);
  });

  // Local button
  it('attack vector\'s local button updates vector input field correctly', async () => {
    await activateFactorButton(subject, 'Attack Vector', 'Local');
    const inputVectorValue = subject.find('.vector-input');
    expect(inputVectorValue.text()).toContain('AV:L');
    // Reactivating button
    await activateFactorButton(subject, 'Attack Vector', 'Local');
    expect(inputVectorValue.text().includes('AV:L')).toBe(false);
  });

  // Physical button
  it('attack vector\'s physical button updates vector input field correctly', async () => {
    await activateFactorButton(subject, 'Attack Vector', 'Physical');
    const inputVectorValue = subject.find('.vector-input');
    expect(inputVectorValue.text()).toContain('AV:P');
    // Reactivating button
    await activateFactorButton(subject, 'Attack Vector', 'Physical');
    expect(inputVectorValue.text().includes('AV:P')).toBe(false);
  });

  // Attack Complexity
  // Low button
  it('attack complexity\'s low button updates vector input field correctly', async () => {
    await activateFactorButton(subject, 'Attack Complexity', 'Low');
    const inputVectorValue = subject.find('.vector-input');
    expect(inputVectorValue.text()).toContain('AC:L');
    // Reactivating button
    await activateFactorButton(subject, 'Attack Complexity', 'Low');
    expect(inputVectorValue.text().includes('AC:L')).toBe(false);
  });

  // High button
  it('attack complexity\'s high button updates vector input field correctly', async () => {
    await activateFactorButton(subject, 'Attack Complexity', 'High');
    const inputVectorValue = subject.find('.vector-input');
    expect(inputVectorValue.text()).toContain('AC:H');
    // Reactivating button
    await activateFactorButton(subject, 'Attack Complexity', 'High');
    expect(inputVectorValue.text().includes('AC:H')).toBe(false);
  });

  // Privileges Required
  // None button
  it('privileges required\'s none button updates vector input field correctly', async () => {
    await activateFactorButton(subject, 'Privileges Required', 'None');
    const inputVectorValue = subject.find('.vector-input');
    expect(inputVectorValue.text()).toContain('PR:N');
    // Reactivating button
    await activateFactorButton(subject, 'Privileges Required', 'None');
    expect(inputVectorValue.text().includes('PR:N')).toBe(false);
  });

  // Low button
  it('privileges required\'s low button updates vector input field correctly', async () => {
    await activateFactorButton(subject, 'Privileges Required', 'Low');
    const inputVectorValue = subject.find('.vector-input');
    expect(inputVectorValue.text()).toContain('PR:L');
    // Reactivating button
    await activateFactorButton(subject, 'Privileges Required', 'Low');
    expect(inputVectorValue.text().includes('PR:L')).toBe(false);
  });

  // High button
  it('privileges required\'s high button updates vector input field correctly', async () => {
    await activateFactorButton(subject, 'Privileges Required', 'High');
    const inputVectorValue = subject.find('.vector-input');
    expect(inputVectorValue.text()).toContain('PR:H');
    // Reactivating button
    await activateFactorButton(subject, 'Privileges Required', 'High');
    expect(inputVectorValue.text().includes('PR:H')).toBe(false);
  });

  // User Interaction
  // None button
  it('user Interaction\'s none button updates vector input field correctly', async () => {
    await activateFactorButton(subject, 'User Interaction', 'None');
    const inputVectorValue = subject.find('.vector-input');
    expect(inputVectorValue.text()).toContain('UI:N');
    // Reactivating button
    await activateFactorButton(subject, 'User Interaction', 'None');
    expect(inputVectorValue.text().includes('UI:N')).toBe(false);
  });

  // Required button
  it('user Interaction\'s required button updates vector input field correctly', async () => {
    await activateFactorButton(subject, 'User Interaction', 'Required');
    const inputVectorValue = subject.find('.vector-input');
    expect(inputVectorValue.text()).toContain('UI:R');
    // Reactivating button
    await activateFactorButton(subject, 'User Interaction', 'Required');
    expect(inputVectorValue.text().includes('UI:R')).toBe(false);
  });

  // Scope
  // Unchanged button
  it('scope\'s unchanged button updates vector input field correctly', async () => {
    await activateFactorButton(subject, 'Scope', 'Unchanged');
    const inputVectorValue = subject.find('.vector-input');
    expect(inputVectorValue.text()).toContain('S:U');
    // Reactivating button
    await activateFactorButton(subject, 'Scope', 'Unchanged');
    expect(inputVectorValue.text().includes('S:U')).toBe(false);
  });

  // Changed button
  it('scope\'s changed button updates vector input field correctly', async () => {
    await activateFactorButton(subject, 'Scope', 'Changed');
    const inputVectorValue = subject.find('.vector-input');
    expect(inputVectorValue.text()).toContain('S:C');
    // Reactivating button
    await activateFactorButton(subject, 'Scope', 'Changed');
    expect(inputVectorValue.text().includes('S:C')).toBe(false);
  });

  // Confidentiality
  // None button
  it('confidentiality\'s none button updates vector input field correctly', async () => {
    await activateFactorButton(subject, 'Confidentiality', 'None');
    const inputVectorValue = subject.find('.vector-input');
    expect(inputVectorValue.text()).toContain('C:N');
    // Reactivating button
    await activateFactorButton(subject, 'Confidentiality', 'None');
    expect(inputVectorValue.text().includes('C:N')).toBe(false);
  });

  // Low button
  it('confidentiality\'s low button updates vector input field correctly', async () => {
    await activateFactorButton(subject, 'Confidentiality', 'Low');
    const inputVectorValue = subject.find('.vector-input');
    expect(inputVectorValue.text()).toContain('C:L');
    // Reactivating button
    await activateFactorButton(subject, 'Confidentiality', 'Low');
    expect(inputVectorValue.text().includes('C:L')).toBe(false);
  });

  // High button
  it('confidentiality\'s high button updates vector input field correctly', async () => {
    await activateFactorButton(subject, 'Confidentiality', 'High');
    const inputVectorValue = subject.find('.vector-input');
    expect(inputVectorValue.text()).toContain('C:H');
    // Reactivating button
    await activateFactorButton(subject, 'Confidentiality', 'High');
    expect(inputVectorValue.text().includes('C:H')).toBe(false);
  });

  // Integrity
  // None button
  it('integrity\'s none button updates vector input field correctly', async () => {
    await activateFactorButton(subject, 'Integrity', 'None');
    const inputVectorValue = subject.find('.vector-input');
    expect(inputVectorValue.text()).toContain('I:N');
    // Reactivating button
    await activateFactorButton(subject, 'Integrity', 'None');
    expect(inputVectorValue.text().includes('I:N')).toBe(false);
  });

  // Low button
  it('integrity\'s low button updates vector input field correctly', async () => {
    await activateFactorButton(subject, 'Integrity', 'Low');
    const inputVectorValue = subject.find('.vector-input');
    expect(inputVectorValue.text()).toContain('I:L');
    // Reactivating button
    await activateFactorButton(subject, 'Integrity', 'Low');
    expect(inputVectorValue.text().includes('I:L')).toBe(false);
  });

  // High button
  it('integrity\'s high button updates vector input field correctly', async () => {
    await activateFactorButton(subject, 'Integrity', 'High');
    const inputVectorValue = subject.find('.vector-input');
    expect(inputVectorValue.text()).toContain('I:H');
    // Reactivating button
    await activateFactorButton(subject, 'Integrity', 'High');
    expect(inputVectorValue.text().includes('I:H')).toBe(false);
  });

  // Availability
  // None button
  it('availability\'s none button updates vector input field correctly', async () => {
    await activateFactorButton(subject, 'Availability', 'None');
    const inputVectorValue = subject.find('.vector-input');
    expect(inputVectorValue.text()).toContain('A:N');
    // Reactivating button
    await activateFactorButton(subject, 'Availability', 'None');
    expect(inputVectorValue.text().includes('A:N')).toBe(false);
  });

  // Low button
  it('availability\'s low button updates vector input field correctly', async () => {
    await activateFactorButton(subject, 'Availability', 'Low');
    const inputVectorValue = subject.find('.vector-input');
    expect(inputVectorValue.text()).toContain('A:L');
    // Reactivating button
    await activateFactorButton(subject, 'Availability', 'Low');
    expect(inputVectorValue.text().includes('A:L')).toBe(false);
  });

  // High button
  it('availability\'s high button updates vector input field correctly', async () => {
    await activateFactorButton(subject, 'Availability', 'High');
    const inputVectorValue = subject.find('.vector-input');
    expect(inputVectorValue.text()).toContain('A:H');
    // Reactivating button
    await activateFactorButton(subject, 'Availability', 'High');
    expect(inputVectorValue.text().includes('A:H')).toBe(false);
  });
});
