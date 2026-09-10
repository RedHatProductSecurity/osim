import { mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import { describe, expect, it } from 'vitest';

import SRPMilestoneDialog from '@/components/CRA/SRPMilestoneDialog.vue';

import { mockSRPReport } from './fixtures';

const mockMilestone = mockSRPReport.milestones[0];

const mountOptions = { global: { plugins: [createTestingPinia()] } };

async function mountAndOpen(props: Record<string, unknown>) {
  const wrapper = mount(SRPMilestoneDialog, {
    props: { show: false, ...props },
    ...mountOptions,
  });
  await wrapper.setProps({ show: true });
  return wrapper;
}

describe('sRPMilestoneDialog', () => {
  it('renders when show is true', async () => {
    const wrapper = await mountAndOpen({});
    expect(wrapper.find('.modal').exists()).toBe(true);
  });

  it('does not render when show is false', () => {
    const wrapper = mount(SRPMilestoneDialog, {
      props: { show: false },
      ...mountOptions,
    });
    expect(wrapper.find('.modal').exists()).toBe(false);
  });

  it('blocks save and shows errors when required fields are empty (new milestone)', async () => {
    const wrapper = await mountAndOpen({});

    await wrapper.find('.modal-footer .btn-primary').trigger('click');

    expect(wrapper.emitted('save')).toBeFalsy();
    expect(wrapper.find('.is-invalid').exists()).toBe(true);
    expect(wrapper.find('.invalid-feedback').text()).toBe('Required');
  });

  it('clears stale validation errors when reopened', async () => {
    const wrapper = await mountAndOpen({});

    // Trigger validation errors
    await wrapper.find('.modal-footer .btn-primary').trigger('click');
    expect(wrapper.find('.is-invalid').exists()).toBe(true);

    // Close and reopen
    await wrapper.setProps({ show: false });
    await wrapper.setProps({ show: true });

    expect(wrapper.find('.is-invalid').exists()).toBe(false);
  });

  it('blocks save and shows errors for required SRP fields on a 72h milestone', async () => {
    const milestone72h = { ...mockMilestone, milestone_type: '72h' as const, additional_details: {} };
    const wrapper = await mountAndOpen({ milestone: milestone72h, eventType: 'EXPLOITS_KEV_APPROVED' });

    await wrapper.find('.modal-footer .btn-primary').trigger('click');

    expect(wrapper.emitted('save')).toBeFalsy();
    // corrective_measures_taken, corrective_measures_for_users, aev_general_information required at 72h
    expect(wrapper.findAll('.is-invalid').length).toBeGreaterThan(0);
  });

  it('allows save when all required SRP fields are filled on a 72h milestone', async () => {
    const milestone72h = { ...mockMilestone, milestone_type: '72h' as const, additional_details: {} };
    const wrapper = await mountAndOpen({ milestone: milestone72h, eventType: 'EXPLOITS_KEV_APPROVED' });

    for (const ta of wrapper.findAll('textarea')) {
      await ta.setValue('filled value');
    }

    await wrapper.find('.modal-footer .btn-primary').trigger('click');

    expect(wrapper.emitted('save')).toBeTruthy();
    expect(wrapper.find('.is-invalid').exists()).toBe(false);
  });

  it('saves array-valued fields as arrays; splits edited values by comma', async () => {
    // Use a final AEV milestone with all required fields pre-filled so only
    // member_states_available behaviour is under test.
    const requiredDetails = {
      member_states_available: ['ES', 'FR'],
      corrective_measures_taken: 'done',
      corrective_measures_for_users: 'update now',
      measure_available_date: '2026-01-01',
      vulnerability_severity: 'high',
      vulnerability_impact: 'remote code execution',
    };
    const milestoneFinal = {
      ...mockMilestone,
      milestone_type: 'final' as const,
      additional_details: requiredDetails,
    };

    // Unchanged value — should restore original array
    const wrapperUnchanged = await mountAndOpen({
      milestone: milestoneFinal,
      eventType: 'EXPLOITS_KEV_APPROVED',
    });
    await wrapperUnchanged.find('.modal-footer .btn-primary').trigger('click');
    const savedUnchanged = wrapperUnchanged.emitted('save')?.[0]?.[0] as Record<string, any>;
    expect(savedUnchanged?.additional_details?.member_states_available).toEqual(['ES', 'FR']);

    // Edited value — should split by comma
    const wrapperEdited = await mountAndOpen({
      milestone: milestoneFinal,
      eventType: 'EXPLOITS_KEV_APPROVED',
    });
    const memberStatesInput = wrapperEdited.findAll('input[type="text"]')
      .find(i => i.element.closest('.mb-3')?.textContent?.includes('Member States'));
    await memberStatesInput?.setValue('DE, PL, IT');
    await wrapperEdited.find('.modal-footer .btn-primary').trigger('click');
    const savedEdited = wrapperEdited.emitted('save')?.[0]?.[0] as Record<string, any>;
    expect(savedEdited?.additional_details?.member_states_available).toEqual(['DE', 'PL', 'IT']);
  });

  it('emits save and close events when save button clicked', async () => {
    const wrapper = await mountAndOpen({});

    await wrapper.find('input[type="date"]').setValue('2026-08-21');
    await wrapper.findAll('input[type="text"]').at(0)?.setValue('ENISA Portal');
    await wrapper.find('textarea').setValue('Request for additional information');

    const footer = wrapper.find('.modal-footer');
    await footer.findAll('.btn-primary').at(0)?.trigger('click');

    expect(wrapper.emitted('save')).toBeTruthy();
    expect(wrapper.emitted('close')).toBeTruthy();
  });
});
