import { mount } from '@vue/test-utils';
import { describe, it, expect } from 'vitest';

import { mockSettingsStore } from '@/stores/__tests__/SettingsStore.spec';

import Settings from '../Settings.vue';

const subject = mount(Settings, {
  plugins: [mockSettingsStore],
  global: {
    stubs: {
      ChangeLog: true
    }
  }
});

describe('Settings', () => {
  it('renders 2 inputs', () => {
    const inputs = subject.findAll('input.form-control');
    expect(subject.find('div.osim-content.container')).toBeTruthy();
    expect(inputs.length).toBe(2);
    expect(
      inputs.every(
        (input) =>
          (input.element as HTMLInputElement).placeholder === '[none saved]'
      )
    ).toBe(true);
  });
});
