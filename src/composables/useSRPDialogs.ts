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
  const editingReportUuid = ref<string>('');
  const viewPayloadReport = ref<SRPReport | undefined>();

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
    showMilestoneDialog.value = true;
  }

  function openEditMilestoneDialog(milestone: SRPReportMilestone) {
    editingMilestone.value = milestone;
    showMilestoneDialog.value = true;
  }

  function closeMilestoneDialog() {
    showMilestoneDialog.value = false;
  }

  // Payload dialog actions
  function openViewPayload(report: SRPReport) {
    viewPayloadReport.value = report;
    showPayloadDialog.value = true;
  }

  function closePayloadDialog() {
    showPayloadDialog.value = false;
  }

  return {
    // Close functions
    closeMilestoneDialog,
    closePayloadDialog,
    closeReportDialog,
    // State
    editingMilestone,
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
    viewPayloadReport,
  };
}
