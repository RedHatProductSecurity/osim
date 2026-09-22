import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';

import EUStatesSelector from '@/components/CRA/EUStatesSelector.vue';

describe('eUStatesSelector', () => {
  it('renders with no selected states initially', () => {
    const wrapper = mount(EUStatesSelector, {
      props: {
        modelValue: [],
      },
    });

    expect(wrapper.text()).toContain('No countries selected');
    expect(wrapper.text()).toContain('0 of 27 EU member states selected');
  });

  it('displays selected states as badges', () => {
    const wrapper = mount(EUStatesSelector, {
      props: {
        modelValue: ['ES', 'FR', 'DE'],
      },
    });

    expect(wrapper.text()).toContain('ES');
    expect(wrapper.text()).toContain('FR');
    expect(wrapper.text()).toContain('DE');
    expect(wrapper.text()).toContain('3 of 27 EU member states selected');
  });

  it('emits update when "Select All" button is clicked', async () => {
    const wrapper = mount(EUStatesSelector, {
      props: {
        modelValue: [],
      },
    });

    const selectAllButton = wrapper.findAll('button')
      .find(btn => btn.text().includes('Select All'));
    await selectAllButton?.trigger('click');

    const emitted = wrapper.emitted('update:modelValue');
    expect(emitted).toBeTruthy();
    expect(emitted?.[0]?.[0]).toHaveLength(27);
    expect(emitted?.[0]?.[0]).toContain('ES');
    expect(emitted?.[0]?.[0]).toContain('EL'); // Greece
  });

  it('emits update when "Clear All" button is clicked', async () => {
    const wrapper = mount(EUStatesSelector, {
      props: {
        modelValue: ['ES', 'FR'],
      },
    });

    const clearAllButton = wrapper.findAll('button')
      .find(btn => btn.text().includes('Clear All'));
    await clearAllButton?.trigger('click');

    const emitted = wrapper.emitted('update:modelValue');
    expect(emitted).toBeTruthy();
    expect(emitted?.[0]?.[0]).toEqual([]);
  });

  it('shows dropdown when "Add Country" button is clicked', async () => {
    const wrapper = mount(EUStatesSelector, {
      props: {
        modelValue: [],
      },
    });

    // Initially dropdown is hidden
    expect(wrapper.find('.dropdown-menu.show').exists()).toBe(false);

    // Click "Add Country" button
    const addButton = wrapper.findAll('button')
      .find(btn => btn.text().includes('Add Country'));
    await addButton?.trigger('click');

    // Dropdown should now be visible
    expect(wrapper.find('.dropdown-menu.show').exists()).toBe(true);
    expect(wrapper.text()).toContain('Austria');
    expect(wrapper.text()).toContain('Spain');
  });

  it('adds a country when dropdown item is clicked', async () => {
    const wrapper = mount(EUStatesSelector, {
      props: {
        modelValue: [],
      },
    });

    // Open dropdown
    const addButton = wrapper.findAll('button')
      .find(btn => btn.text().includes('Add Country'));
    await addButton?.trigger('click');

    // Click on Spain
    const spainItem = wrapper.findAll('.dropdown-item')
      .find(item => item.text().includes('Spain'));
    await spainItem?.trigger('click');

    const emitted = wrapper.emitted('update:modelValue');
    expect(emitted).toBeTruthy();
    expect(emitted?.[0]?.[0]).toEqual(['ES']);
  });

  it('removes a country when badge close button is clicked', async () => {
    const wrapper = mount(EUStatesSelector, {
      props: {
        modelValue: ['ES', 'FR', 'DE'],
      },
    });

    // Find close button for FR
    const badges = wrapper.findAll('.badge');
    const frBadge = badges.find(badge => badge.text().includes('FR'));
    const closeButton = frBadge?.find('.btn-close');
    await closeButton?.trigger('click');

    const emitted = wrapper.emitted('update:modelValue');
    expect(emitted).toBeTruthy();
    expect(emitted?.[0]?.[0]).toEqual(['ES', 'DE']);
  });

  it('disables "Add Country" button when all states are selected', () => {
    const allStates = [
      'AT',
      'BE',
      'BG',
      'CY',
      'CZ',
      'DE',
      'DK',
      'EE',
      'ES',
      'FI',
      'FR',
      'EL',
      'HR',
      'HU',
      'IE',
      'IT',
      'LT',
      'LU',
      'LV',
      'MT',
      'NL',
      'PL',
      'PT',
      'RO',
      'SE',
      'SI',
      'SK',
    ];

    const wrapper = mount(EUStatesSelector, {
      props: {
        modelValue: allStates,
      },
    });

    const addButton = wrapper.findAll('button')
      .find(btn => btn.text().includes('Add Country'));
    expect(addButton?.attributes('disabled')).toBeDefined();
  });

  it('disables "Clear All" button when no states are selected', () => {
    const wrapper = mount(EUStatesSelector, {
      props: {
        modelValue: [],
      },
    });

    const clearAllButton = wrapper.findAll('button')
      .find(btn => btn.text().includes('Clear All'));
    expect(clearAllButton?.attributes('disabled')).toBeDefined();
  });

  it('sorts selected states alphabetically', async () => {
    const wrapper = mount(EUStatesSelector, {
      props: {
        modelValue: ['FR'],
      },
    });

    // Add ES (should be sorted before FR)
    const addButton = wrapper.findAll('button')
      .find(btn => btn.text().includes('Add Country'));
    await addButton?.trigger('click');

    const spainItem = wrapper.findAll('.dropdown-item')
      .find(item => item.text().includes('Spain'));
    await spainItem?.trigger('click');

    const emitted = wrapper.emitted('update:modelValue');
    expect(emitted).toBeTruthy();
    expect(emitted?.[0]?.[0]).toEqual(['ES', 'FR']); // Sorted
  });
});
