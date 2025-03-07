import { mount } from '@vue/test-utils';
import { describe, it, expect } from 'vitest';

import Settings from '@/components/Settings/Settings.vue';

import { mockSettingsStore } from '@/stores/__tests__/SettingsStore.spec';

const subject = mount(Settings, {
  plugins: [mockSettingsStore],
});

describe('settings', () => {
  it('renders 2 inputs', () => {
    const inputs = subject.findAll('input.form-control');
    expect(subject.find('div.osim-content.container')).toBeTruthy();
    expect(inputs.length).toBe(2);
    expect(
      inputs.every(
        input =>
          (input.element as HTMLInputElement).placeholder === '[none saved]',
      ),
    ).toBe(true);
  });
});
