import { mount } from '@vue/test-utils';
import { describe, it, expect } from 'vitest';

import CvssCalculator from '../CvssCalculator.vue';

function activateFactorButton(subject: any, factor: string, value: string) {
  const factorButtonGroup = subject.findAll('.btn-group-vertical')
    .filter((node: { text: () => string | string[]; }) => node.text().includes(factor))[0];
  const factorButton = factorButtonGroup
    .findAll('.btn')
    .filter((node: { text: () => string; }) => node.text() === value)[0];
  factorButton.trigger('click');
}

function activateMultipleFactorButtons(subject: any, factorValuePairs: [string, string][]) {
  for (const [factor, value] of factorValuePairs) {
    activateFactorButton(subject, factor, value);
  }
}

describe('CvssCalculator', () => {

  let subject: any;

  beforeEach(() => {
    subject = mount(CvssCalculator, {
      props: {
        'cvssScore': null,
        'onUpdate:cvssScore': (e: any) => subject.setProps({ 'cvssScore': e }),
        'cvssVector': '',
        'onUpdate:cvssVector': (e: any) => subject.setProps({ 'cvssVector': e }),
      },
    });
  });

  it('Shows calculator on input focus', async () => {
    await subject.find('.vector-input').trigger('focus');
    expect(subject.find('.cvss-calculator').classes('visually-hidden')).toBe(false);
  });

  it('Hides calculator on input blur', async () => {
    await subject.find('.vector-input');
    expect(subject.find('.cvss-calculator').classes('visually-hidden')).toBe(true);
  });

  // Validations
  it('Doesn\'t show validation on empty vector', async () => {
    const inputVectorValue = subject.find('.vector-input');
    expect(inputVectorValue.classes().includes('is-invalid')).toBe(false);
  });

  it('Doesn\'t show validation on complete vector', async () => {
    const factorValuePairs: [string, string][] = [
      ['Attack Vector', 'Network'],
      ['Attack Complexity', 'Low'],
      ['Privileges Required', 'None'],
      ['User Interaction', 'None'],
      ['Scope', 'Changed'],
      ['Confidentiality', 'High'],
      ['Integrity', 'High'],
      ['Availability', 'High']
    ];
    await activateMultipleFactorButtons(subject, factorValuePairs);
    const inputVectorValue = subject.find('.vector-input');
    expect(inputVectorValue.classes().includes('is-invalid')).toBe(false);
  });

  it('Shows validation on incomplete vector', async () => {
    const factorValuePairs: [string, string][] = [
      ['Availability', 'High']
    ];
    await activateMultipleFactorButtons(subject, factorValuePairs);
    const inputVectorValue = subject.find('.vector-input');
    expect(inputVectorValue.classes().includes('is-invalid')).toBe(true);
  });

  // Score Calculation Test Cases
  // Critical score
  it('Calculates critical score correctly', async () => {
    const factorValuePairs: [string, string][] = [
      ['Attack Vector', 'Network'],
      ['Attack Complexity', 'Low'],
      ['Privileges Required', 'None'],
      ['User Interaction', 'None'],
      ['Scope', 'Changed'],
      ['Confidentiality', 'High'],
      ['Integrity', 'High'],
      ['Availability', 'High']
    ];
    await activateMultipleFactorButtons(subject, factorValuePairs);
    const inputVectorValue = subject.find('.vector-input');
    expect(inputVectorValue.text()).toBe('CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H');
    const inputScoreValue = subject.find('.score-input');
    expect(inputScoreValue.text()).toContain('10');
  });

  // High score
  it('Calculates high score correctly', async () => {
    const factorValuePairs: [string, string][] = [
      ['Attack Vector', 'Adjacent'],
      ['Attack Complexity', 'High'],
      ['Privileges Required', 'Low'],
      ['User Interaction', 'Required'],
      ['Scope', 'Changed'],
      ['Confidentiality', 'Low'],
      ['Integrity', 'High'],
      ['Availability', 'High']
    ];
    await activateMultipleFactorButtons(subject, factorValuePairs);
    const inputVectorValue = subject.find('.vector-input');
    expect(inputVectorValue.text()).toBe('CVSS:3.1/AV:A/AC:H/PR:L/UI:R/S:C/C:L/I:H/A:H');
    const inputScoreValue = subject.find('.score-input');
    expect(inputScoreValue.text()).toContain('7.5');
  });

  // Medium score
  it('Calculates medium score correctly', async () => {
    const factorValuePairs: [string, string][] = [
      ['Attack Vector', 'Adjacent'],
      ['Attack Complexity', 'High'],
      ['Privileges Required', 'Low'],
      ['User Interaction', 'Required'],
      ['Scope', 'Unchanged'],
      ['Confidentiality', 'Low'],
      ['Integrity', 'Low'],
      ['Availability', 'Low']
    ];
    await activateMultipleFactorButtons(subject, factorValuePairs);
    const inputVectorValue = subject.find('.vector-input');
    expect(inputVectorValue.text()).toBe('CVSS:3.1/AV:A/AC:H/PR:L/UI:R/S:U/C:L/I:L/A:L');
    const inputScoreValue = subject.find('.score-input');
    expect(inputScoreValue.text()).toContain('4.3');
  });

  // Low score
  it('Calculates low score correctly', async () => {
    const factorValuePairs: [string, string][] = [
      ['Attack Vector', 'Local'],
      ['Attack Complexity', 'High'],
      ['Privileges Required', 'High'],
      ['User Interaction', 'Required'],
      ['Scope', 'Unchanged'],
      ['Confidentiality', 'None'],
      ['Integrity', 'Low'],
      ['Availability', 'Low']
    ];
    await activateMultipleFactorButtons(subject, factorValuePairs);
    const inputVectorValue = subject.find('.vector-input');
    expect(inputVectorValue.text()).toBe('CVSS:3.1/AV:L/AC:H/PR:H/UI:R/S:U/C:N/I:L/A:L');
    const inputScoreValue = subject.find('.score-input');
    expect(inputScoreValue.text()).toContain('2.9');
  });

  // Zero score
  it('Calculates zero score correctly', async () => {
    const factorValuePairs: [string, string][] = [
      ['Attack Vector', 'Physical'],
      ['Attack Complexity', 'High'],
      ['Privileges Required', 'High'],
      ['User Interaction', 'Required'],
      ['Scope', 'Unchanged'],
      ['Confidentiality', 'None'],
      ['Integrity', 'None'],
      ['Availability', 'None']
    ];
    await activateMultipleFactorButtons(subject, factorValuePairs);
    const inputVectorValue = subject.find('.vector-input');
    expect(inputVectorValue.text()).toBe('CVSS:3.1/AV:P/AC:H/PR:H/UI:R/S:U/C:N/I:N/A:N');
    const inputScoreValue = subject.find('.score-input');
    expect(inputScoreValue.text()).toContain('0');
  });

  // Calculator Buttons Test Cases
  // Attack Vector
  // Network button
  it('Attack vector\'s network button updates vector input field correctly', async () => {
    await activateFactorButton(subject, 'Attack Vector', 'Network');
    const inputVectorValue = subject.find('.vector-input');
    expect(inputVectorValue.text()).toContain('AV:N');
    // Reactivating button
    await activateFactorButton(subject, 'Attack Vector', 'Network');
    expect(inputVectorValue.text().includes('AV:N')).toBe(false);
  });

  // Adjacent button
  it('Attack vector\'s adjacent button updates vector input field correctly', async () => {
    await activateFactorButton(subject, 'Attack Vector', 'Adjacent');
    const inputVectorValue = subject.find('.vector-input');
    expect(inputVectorValue.text()).toContain('AV:A');
    // Reactivating button
    await activateFactorButton(subject, 'Attack Vector', 'Adjacent');
    expect(inputVectorValue.text().includes('AV:A')).toBe(false);
  });

  // Local button
  it('Attack vector\'s local button updates vector input field correctly', async () => {
    await activateFactorButton(subject, 'Attack Vector', 'Local');
    const inputVectorValue = subject.find('.vector-input');
    expect(inputVectorValue.text()).toContain('AV:L');
    // Reactivating button
    await activateFactorButton(subject, 'Attack Vector', 'Local');
    expect(inputVectorValue.text().includes('AV:L')).toBe(false);
  });

  // Physical button
  it('Attack vector\'s physical button updates vector input field correctly', async () => {
    await activateFactorButton(subject, 'Attack Vector', 'Physical');
    const inputVectorValue = subject.find('.vector-input');
    expect(inputVectorValue.text()).toContain('AV:P');
    // Reactivating button
    await activateFactorButton(subject, 'Attack Vector', 'Physical');
    expect(inputVectorValue.text().includes('AV:P')).toBe(false);
  });

  // Attack Complexity
  // Low button
  it('Attack complexity\'s low button updates vector input field correctly', async () => {
    await activateFactorButton(subject, 'Attack Complexity', 'Low');
    const inputVectorValue = subject.find('.vector-input');
    expect(inputVectorValue.text()).toContain('AC:L');
    // Reactivating button
    await activateFactorButton(subject, 'Attack Complexity', 'Low');
    expect(inputVectorValue.text().includes('AC:L')).toBe(false);
  });

  // High button
  it('Attack complexity\'s high button updates vector input field correctly', async () => {
    await activateFactorButton(subject, 'Attack Complexity', 'High');
    const inputVectorValue = subject.find('.vector-input');
    expect(inputVectorValue.text()).toContain('AC:H');
    // Reactivating button
    await activateFactorButton(subject, 'Attack Complexity', 'High');
    expect(inputVectorValue.text().includes('AC:H')).toBe(false);
  });

  // Privileges Required
  // None button
  it('Privileges required\'s none button updates vector input field correctly', async () => {
    await activateFactorButton(subject, 'Privileges Required', 'None');
    const inputVectorValue = subject.find('.vector-input');
    expect(inputVectorValue.text()).toContain('PR:N');
    // Reactivating button
    await activateFactorButton(subject, 'Privileges Required', 'None');
    expect(inputVectorValue.text().includes('PR:N')).toBe(false);
  });

  // Low button
  it('Privileges required\'s low button updates vector input field correctly', async () => {
    await activateFactorButton(subject, 'Privileges Required', 'Low');
    const inputVectorValue = subject.find('.vector-input');
    expect(inputVectorValue.text()).toContain('PR:L');
    // Reactivating button
    await activateFactorButton(subject, 'Privileges Required', 'Low');
    expect(inputVectorValue.text().includes('PR:L')).toBe(false);
  });

  // High button
  it('Privileges required\'s high button updates vector input field correctly', async () => {
    await activateFactorButton(subject, 'Privileges Required', 'High');
    const inputVectorValue = subject.find('.vector-input');
    expect(inputVectorValue.text()).toContain('PR:H');
    // Reactivating button
    await activateFactorButton(subject, 'Privileges Required', 'High');
    expect(inputVectorValue.text().includes('PR:H')).toBe(false);
  });

  // User Interaction
  // None button
  it('User Interaction\'s none button updates vector input field correctly', async () => {
    await activateFactorButton(subject, 'User Interaction', 'None');
    const inputVectorValue = subject.find('.vector-input');
    expect(inputVectorValue.text()).toContain('UI:N');
    // Reactivating button
    await activateFactorButton(subject, 'User Interaction', 'None');
    expect(inputVectorValue.text().includes('UI:N')).toBe(false);
  });

  // Required button
  it('User Interaction\'s required button updates vector input field correctly', async () => {
    await activateFactorButton(subject, 'User Interaction', 'Required');
    const inputVectorValue = subject.find('.vector-input');
    expect(inputVectorValue.text()).toContain('UI:R');
    // Reactivating button
    await activateFactorButton(subject, 'User Interaction', 'Required');
    expect(inputVectorValue.text().includes('UI:R')).toBe(false);
  });

  // Scope
  // Unchanged button
  it('Scope\'s unchanged button updates vector input field correctly', async () => {
    await activateFactorButton(subject, 'Scope', 'Unchanged');
    const inputVectorValue = subject.find('.vector-input');
    expect(inputVectorValue.text()).toContain('S:U');
    // Reactivating button
    await activateFactorButton(subject, 'Scope', 'Unchanged');
    expect(inputVectorValue.text().includes('S:U')).toBe(false);
  });

  // Changed button
  it('Scope\'s changed button updates vector input field correctly', async () => {
    await activateFactorButton(subject, 'Scope', 'Changed');
    const inputVectorValue = subject.find('.vector-input');
    expect(inputVectorValue.text()).toContain('S:C');
    // Reactivating button
    await activateFactorButton(subject, 'Scope', 'Changed');
    expect(inputVectorValue.text().includes('S:C')).toBe(false);
  });

  // Confidentiality
  // None button
  it('Confidentiality\'s none button updates vector input field correctly', async () => {
    await activateFactorButton(subject, 'Confidentiality', 'None');
    const inputVectorValue = subject.find('.vector-input');
    expect(inputVectorValue.text()).toContain('C:N');
    // Reactivating button
    await activateFactorButton(subject, 'Confidentiality', 'None');
    expect(inputVectorValue.text().includes('C:N')).toBe(false);
  });

  // Low button
  it('Confidentiality\'s low button updates vector input field correctly', async () => {
    await activateFactorButton(subject, 'Confidentiality', 'Low');
    const inputVectorValue = subject.find('.vector-input');
    expect(inputVectorValue.text()).toContain('C:L');
    // Reactivating button
    await activateFactorButton(subject, 'Confidentiality', 'Low');
    expect(inputVectorValue.text().includes('C:L')).toBe(false);
  });

  // High button
  it('Confidentiality\'s high button updates vector input field correctly', async () => {
    await activateFactorButton(subject, 'Confidentiality', 'High');
    const inputVectorValue = subject.find('.vector-input');
    expect(inputVectorValue.text()).toContain('C:H');
    // Reactivating button
    await activateFactorButton(subject, 'Confidentiality', 'High');
    expect(inputVectorValue.text().includes('C:H')).toBe(false);
  });

  // Integrity
  // None button
  it('Integrity\'s none button updates vector input field correctly', async () => {
    await activateFactorButton(subject, 'Integrity', 'None');
    const inputVectorValue = subject.find('.vector-input');
    expect(inputVectorValue.text()).toContain('I:N');
    // Reactivating button
    await activateFactorButton(subject, 'Integrity', 'None');
    expect(inputVectorValue.text().includes('I:N')).toBe(false);
  });

  // Low button
  it('Integrity\'s low button updates vector input field correctly', async () => {
    await activateFactorButton(subject, 'Integrity', 'Low');
    const inputVectorValue = subject.find('.vector-input');
    expect(inputVectorValue.text()).toContain('I:L');
    // Reactivating button
    await activateFactorButton(subject, 'Integrity', 'Low');
    expect(inputVectorValue.text().includes('I:L')).toBe(false);
  });

  // High button
  it('Integrity\'s high button updates vector input field correctly', async () => {
    await activateFactorButton(subject, 'Integrity', 'High');
    const inputVectorValue = subject.find('.vector-input');
    expect(inputVectorValue.text()).toContain('I:H');
    // Reactivating button
    await activateFactorButton(subject, 'Integrity', 'High');
    expect(inputVectorValue.text().includes('I:H')).toBe(false);
  });

  // Availability
  // None button
  it('Availability\'s none button updates vector input field correctly', async () => {
    await activateFactorButton(subject, 'Availability', 'None');
    const inputVectorValue = subject.find('.vector-input');
    expect(inputVectorValue.text()).toContain('A:N');
    // Reactivating button
    await activateFactorButton(subject, 'Availability', 'None');
    expect(inputVectorValue.text().includes('A:N')).toBe(false);
  });

  // Low button
  it('Availability\'s low button updates vector input field correctly', async () => {
    await activateFactorButton(subject, 'Availability', 'Low');
    const inputVectorValue = subject.find('.vector-input');
    expect(inputVectorValue.text()).toContain('A:L');
    // Reactivating button
    await activateFactorButton(subject, 'Availability', 'Low');
    expect(inputVectorValue.text().includes('A:L')).toBe(false);
  });

  // High button
  it('Availability\'s high button updates vector input field correctly', async () => {
    await activateFactorButton(subject, 'Availability', 'High');
    const inputVectorValue = subject.find('.vector-input');
    expect(inputVectorValue.text()).toContain('A:H');
    // Reactivating button
    await activateFactorButton(subject, 'Availability', 'High');
    expect(inputVectorValue.text().includes('A:H')).toBe(false);
  });
});
