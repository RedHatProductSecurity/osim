import { describe, expect, it } from 'vitest';

import type { SRPReport, SRPReportMilestone } from '@/types/cra';

import { useSRPDialogs } from '../useSRPDialogs';

describe('useSRPDialogs', () => {
  it('initializes with correct default values', () => {
    const {
      showMilestoneDialog,
      showPayloadDialog,
      showReportDialog,
    } = useSRPDialogs();

    expect(showReportDialog.value).toBe(false);
    expect(showMilestoneDialog.value).toBe(false);
    expect(showPayloadDialog.value).toBe(false);
  });

  it('opens and closes report dialog', () => {
    const {
      closeReportDialog,
      openAddReportDialog,
      showReportDialog,
    } = useSRPDialogs();

    openAddReportDialog();
    expect(showReportDialog.value).toBe(true);

    closeReportDialog();
    expect(showReportDialog.value).toBe(false);
  });

  it('opens and closes milestone dialog', () => {
    const {
      closeMilestoneDialog,
      openAddMilestoneDialog,
      showMilestoneDialog,
    } = useSRPDialogs();

    openAddMilestoneDialog('report-uuid');
    expect(showMilestoneDialog.value).toBe(true);

    closeMilestoneDialog();
    expect(showMilestoneDialog.value).toBe(false);
  });

  it('opens and closes payload dialog', () => {
    const {
      closePayloadDialog,
      openViewPayload,
      showPayloadDialog,
      viewPayloadMilestone,
      viewPayloadReport,
    } = useSRPDialogs();

    const mockReport = { uuid: 'report-1' } as SRPReport;
    const mockMilestone = { uuid: 'milestone-1' } as SRPReportMilestone;
    openViewPayload(mockReport, mockMilestone);
    expect(showPayloadDialog.value).toBe(true);
    expect(viewPayloadReport.value?.uuid).toBe(mockReport.uuid);
    expect(viewPayloadMilestone.value?.uuid).toBe(mockMilestone.uuid);

    closePayloadDialog();
    expect(showPayloadDialog.value).toBe(false);
    expect(viewPayloadMilestone.value).toBeUndefined();
  });
});
