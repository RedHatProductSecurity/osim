import { ref } from 'vue';

import type { SRPReport, SRPReportMilestone } from '@/types/cra';

export function useSRPDialogs() {
  // Dialog visibility state
  const showReportDialog = ref(false);
  const showMilestoneDialog = ref(false);
  const showPayloadDialog = ref(false);

  // Editing state
  const editingReport = ref<SRPReport | undefined>();
  const editingMilestone = ref<SRPReportMilestone | undefined>();
  const editingMilestoneReport = ref<SRPReport | undefined>();
  const editingReportUuid = ref<string>('');
  const viewPayloadReport = ref<SRPReport | undefined>();
  const viewPayloadMilestone = ref<SRPReportMilestone | undefined>();

  // Report dialog actions
  function openAddReportDialog() {
    editingReport.value = undefined;
    showReportDialog.value = true;
  }

  function openEditReportDialog(report: SRPReport) {
    editingReport.value = report;
    showReportDialog.value = true;
  }

  function closeReportDialog() {
    showReportDialog.value = false;
  }

  // Milestone dialog actions
  function openAddMilestoneDialog(reportUuid: string) {
    editingReportUuid.value = reportUuid;
    editingMilestone.value = undefined;
    editingMilestoneReport.value = undefined;
    showMilestoneDialog.value = true;
  }

  function openEditMilestoneDialog(report: SRPReport, milestone: SRPReportMilestone) {
    editingMilestoneReport.value = report;
    editingMilestone.value = milestone;
    showMilestoneDialog.value = true;
  }

  function closeMilestoneDialog() {
    showMilestoneDialog.value = false;
  }

  // Payload dialog actions
  function openViewPayload(report: SRPReport, milestone: SRPReportMilestone) {
    viewPayloadReport.value = report;
    viewPayloadMilestone.value = milestone;
    showPayloadDialog.value = true;
  }

  function closePayloadDialog() {
    showPayloadDialog.value = false;
    viewPayloadMilestone.value = undefined;
  }

  return {
    // Close functions
    closeMilestoneDialog,
    closePayloadDialog,
    closeReportDialog,
    // State
    editingMilestone,
    editingMilestoneReport,
    editingReport,
    editingReportUuid,
    // Open functions
    openAddMilestoneDialog,
    openAddReportDialog,
    openEditMilestoneDialog,
    openEditReportDialog,
    openViewPayload,
    // Dialog visibility
    showMilestoneDialog,
    showPayloadDialog,
    showReportDialog,
    viewPayloadMilestone,
    viewPayloadReport,
  };
}
