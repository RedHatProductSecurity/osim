import { describe, expect, it } from 'vitest';

import type { SRPReport } from '@/types/cra';

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
    } = useSRPDialogs();

    const mockReport = { uuid: 'report-1' } as SRPReport;
    openViewPayload(mockReport);
    expect(showPayloadDialog.value).toBe(true);

    closePayloadDialog();
    expect(showPayloadDialog.value).toBe(false);
  });
});
