import { describe, expect } from 'vitest';

import { osimFullFlawTest } from '@/components/__tests__/test-suite-helpers';

import type { ZodAffectType } from '@/types';
import { IssuerEnum } from '@/generated-client';
import { CVSS_V3 } from '@/constants';

describe('flawAffectsTableRow', () => {
  osimFullFlawTest('shows CVSS score when affect is not being edited', async ({ flaw }) => {
    const affect = {
      ...flaw.affects[0],
      cvss_scores: [{
        issuer: IssuerEnum.Rh,
        cvss_version: CVSS_V3,
        score: 7.8,
        vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
        uuid: 'test-cvss-uuid',
        alerts: [],
      }],
    } as ZodAffectType;

    const { default: FlawAffectsTableRow } = await import('@/components/FlawAffects/FlawAffectsTableRow.vue');
    const { mount } = await import('@vue/test-utils');
    const { createTestingPinia } = await import('@pinia/testing');

    const subject = mount(FlawAffectsTableRow, {
      props: {
        affect,
        error: null,
        isLast: false,
        isModified: false,
        isNew: false,
        isRemoved: false,
      },
      global: {
        plugins: [createTestingPinia()],
        stubs: {
          CvssCalculatorOverlayed: true,
        },
      },
    });

    const cvssCell = subject.find('td:nth-of-type(10)');
    const cvssScore = cvssCell.find('span');

    expect(cvssScore.exists()).toBe(true);
    expect(cvssScore.text()).toBe('7.8');
    expect(cvssScore.attributes('title')).toBe('CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H');
  });

  osimFullFlawTest('handles affects with no CVSS scores', async ({ flaw }) => {
    const affect = {
      ...flaw.affects[0],
      cvss_scores: [],
    } as ZodAffectType;

    const { default: FlawAffectsTableRow } = await import('@/components/FlawAffects/FlawAffectsTableRow.vue');
    const { mount } = await import('@vue/test-utils');
    const { createTestingPinia } = await import('@pinia/testing');

    const subject = mount(FlawAffectsTableRow, {
      props: {
        affect,
        error: null,
        isLast: false,
        isModified: false,
        isNew: false,
        isRemoved: false,
      },
      global: {
        plugins: [createTestingPinia()],
        stubs: {
          CvssCalculatorOverlayed: true,
        },
      },
    });

    const cvssCell = subject.find('td:nth-of-type(10)');
    const cvssScore = cvssCell.find('span');

    expect(cvssScore.exists()).toBe(true);
    expect(cvssScore.text()).toBe('');
  });

  osimFullFlawTest('initializes currentAffect reference correctly', async ({ flaw }) => {
    const affect = flaw.affects[0];

    const { default: FlawAffectsTableRow } = await import('@/components/FlawAffects/FlawAffectsTableRow.vue');
    const { mount } = await import('@vue/test-utils');
    const { createTestingPinia } = await import('@pinia/testing');

    const subject = mount(FlawAffectsTableRow, {
      props: {
        affect,
        error: null,
        isLast: false,
        isModified: false,
        isNew: false,
        isRemoved: false,
      },
      global: {
        plugins: [createTestingPinia()],
        stubs: {
          CvssCalculatorOverlayed: true,
        },
      },
    });

    const vm = subject.vm as any;
    expect(vm.currentAffect).toBeDefined();
    expect(vm.currentAffect.uuid).toBe(affect.uuid);
    expect(vm.currentAffect.ps_module).toBe(affect.ps_module);
    expect(vm.currentAffect).not.toBe(affect);
  });

  osimFullFlawTest('resets currentAffect to original values', async ({ flaw }) => {
    const affect = flaw.affects[0];

    const { default: FlawAffectsTableRow } = await import('@/components/FlawAffects/FlawAffectsTableRow.vue');
    const { mount } = await import('@vue/test-utils');
    const { createTestingPinia } = await import('@pinia/testing');

    const subject = mount(FlawAffectsTableRow, {
      props: {
        affect,
        error: null,
        isLast: false,
        isModified: false,
        isNew: false,
        isRemoved: false,
      },
      global: {
        plugins: [createTestingPinia()],
        stubs: {
          CvssCalculatorOverlayed: true,
        },
      },
    });

    const vm = subject.vm as any;
    expect(vm.resetCurrentAffect).toBeTypeOf('function');

    vm.currentAffect.ps_module = 'test-modified';
    expect(vm.currentAffect.ps_module).toBe('test-modified');

    vm.resetCurrentAffect();
    expect(vm.currentAffect.ps_module).toBe(affect.ps_module);
  });

  osimFullFlawTest('renders correct template structure', async ({ flaw }) => {
    const affect = flaw.affects[0];

    const { default: FlawAffectsTableRow } = await import('@/components/FlawAffects/FlawAffectsTableRow.vue');
    const { mount } = await import('@vue/test-utils');
    const { createTestingPinia } = await import('@pinia/testing');

    const subject = mount(FlawAffectsTableRow, {
      props: {
        affect,
        error: null,
        isLast: false,
        isModified: false,
        isNew: false,
        isRemoved: false,
      },
      global: {
        plugins: [createTestingPinia()],
        stubs: {
          CvssCalculatorOverlayed: true,
        },
      },
    });

    const cvssCell = subject.find('td:nth-of-type(10)');
    expect(cvssCell.exists()).toBe(true);
    expect(cvssCell.find('span').exists()).toBe(true);
    expect(cvssCell.find('CvssCalculatorOverlayed-stub').exists()).toBe(false);
  });
});
