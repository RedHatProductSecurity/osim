import { mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import { describe, expect, it } from 'vitest';

import SRPMilestoneDialog from '@/components/CRA/SRPMilestoneDialog.vue';
import { mockSRPReport } from '@/components/CRA/__tests__/fixtures';

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
    // corrective_or_mitigating_measures_taken, corrective_or_mitigating_measures_users_can_take,
    // general_information required at 72h
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
      corrective_or_mitigating_measures_taken: 'done',
      corrective_or_mitigating_measures_users_can_take: 'update now',
      corrective_or_mitigating_measure_available_at: '2026-01-01',
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

  it('round-trips aev_detected_at as a full ISO timestamp (datetime-local)', async () => {
    const milestone24h = {
      ...mockMilestone,
      milestone_type: '24h' as const,
      additional_details: {
        aev_detected_at: '2026-03-15T09:30:00Z',
        manufacturer_or_steward_name: 'Red Hat',
      },
    };
    const wrapper = await mountAndOpen({ milestone: milestone24h, eventType: 'EXPLOITS_KEV_APPROVED' });

    await wrapper.find('.modal-footer .btn-primary').trigger('click');

    const saved = wrapper.emitted('save')?.[0]?.[0] as Record<string, any>;
    // Must be a full ISO string containing the time component, not just a date
    expect(saved?.additional_details?.aev_detected_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/);
    expect(saved?.additional_details?.aev_detected_at).not.toMatch(/^\d{4}-\d{2}-\d{2}$/);
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

  it('shows payload field guide for existing milestone', () => {
    const wrapper = mount(SRPMilestoneDialog, {
      props: {
        milestone: mockSRPReport.milestones[0],
        report: mockSRPReport,
        show: true,
      },
      global: {
        plugins: [createTestingPinia()],
      },
    });

    expect(wrapper.text()).toContain('Payload Field Guide');
    expect(wrapper.find('.payload-field-guide').findAll('th').map(header => header.text()))
      .toEqual(['Field', 'Effective Value']);
    expect(wrapper.text()).toContain('Notification Type');
    expect(wrapper.text()).not.toContain('Read-only generated field');
    expect(wrapper.text()).not.toContain('notification_type');
    expect(wrapper.text()).toContain('Date and Time When You Become Aware of the Actively Exploited Vulnerability');
  });
});
