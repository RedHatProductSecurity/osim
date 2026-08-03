<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

import SRPMilestoneDialog from '@/components/CRA/SRPMilestoneDialog.vue';
import SRPPayloadDialog from '@/components/CRA/SRPPayloadDialog.vue';
import SRPReportDetails from '@/components/CRA/SRPReportDetails.vue';
import SRPReportDialog from '@/components/CRA/SRPReportDialog.vue';
import SRPStatusBadge from '@/components/CRA/SRPStatusBadge.vue';

import { useSRPDialogs } from '@/composables/useSRPDialogs';

import type { SRPReport, SRPReportMilestone, SRPReportSummary } from '@/types/cra';
import {
  createAdditionalInfoMilestone,
  createSRPReport,
  fetchSRPReports,
  updateSRPMilestone,
  updateSRPReport,
} from '@/services/SRPService';
import { formatDate } from '@/utils/helpers';
import LabelCollapsible from '@/widgets/LabelCollapsible/LabelCollapsible.vue';
import LoadingSpinner from '@/widgets/LoadingSpinner/LoadingSpinner.vue';

const props = defineProps<{
  flawId: string;
}>();

const srpReports = ref<SRPReport[]>([]);
const isLoading = ref(false);
const error = ref(false);
const isExpanded = ref(true);
const expandedReports = ref<Set<string>>(new Set());

const {
  closeMilestoneDialog,
  closePayloadDialog,
  closeReportDialog,
  editingMilestone,
  editingReport,
  editingReportUuid,
  openAddMilestoneDialog,
  openAddReportDialog,
  openEditMilestoneDialog,
  openEditReportDialog,
  openViewPayload,
  showMilestoneDialog,
  showPayloadDialog,
  showReportDialog,
  viewPayloadReport,
} = useSRPDialogs();

onMounted(async () => {
  await loadSRPReports();
});

async function loadSRPReports() {
  if (!props.flawId) return;

  isLoading.value = true;
  error.value = false;

  try {
    srpReports.value = await fetchSRPReports(props.flawId);
  } catch (err) {
    console.error('Failed to load SRP reports:', err);
    error.value = true;
  } finally {
    isLoading.value = false;
  }
}

const summary = computed<SRPReportSummary>(() => {
  if (!srpReports.value.length) {
    return {
      hasReport: false,
      status: null,
      eventType: null,
      nextDueDate: null,
      overdueMilestones: 0,
    };
  }

  let totalOverdue = 0;

  for (const report of srpReports.value) {
    if (report.milestones) {
      totalOverdue += report.milestones.filter(m =>
        m.is_overdue
        && m.status !== 'submitted'
        && m.status !== 'not_required',
      ).length;
    }
  }

  return {
    hasReport: true,
    status: null,
    eventType: null,
    nextDueDate: null,
    overdueMilestones: totalOverdue,
  };
});

function getNextDueDate(report: SRPReport): Date | null {
  if (!report.milestones) return null;

  const now = new Date();
  const upcomingMilestones = report.milestones
    .filter(m =>
      m.due_at
      && new Date(m.due_at) > now
      && m.status !== 'submitted'
      && m.status !== 'not_required',
    )
    .sort((a, b) => new Date(a.due_at!).getTime() - new Date(b.due_at!).getTime());

  return upcomingMilestones[0]?.due_at ? new Date(upcomingMilestones[0].due_at) : null;
}

function getOverdueMilestones(report: SRPReport): number {
  if (!report.milestones) return 0;

  return report.milestones.filter(m =>
    m.is_overdue
    && m.status !== 'submitted'
    && m.status !== 'not_required',
  ).length;
}

function formatDateDisplay(date: Date | null): string {
  if (!date) return 'N/A';
  return formatDate(date, false);
}

function formatEventType(eventType: null | string): string {
  if (!eventType) return 'N/A';
  return eventType.split('_').map(word =>
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
  ).join(' ');
}

function toggleReportExpanded(reportUuid: string) {
  if (expandedReports.value.has(reportUuid)) {
    expandedReports.value.delete(reportUuid);
  } else {
    expandedReports.value.add(reportUuid);
  }
}

function isReportExpanded(reportUuid: string): boolean {
  return expandedReports.value.has(reportUuid);
}

function handleReportKeydown(event: KeyboardEvent, reportUuid: string) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    toggleReportExpanded(reportUuid);
  }
}

async function handleSaveReport(data: Partial<SRPReport>) {
  try {
    if (editingReport.value) {
      await updateSRPReport(editingReport.value.uuid, data);
    } else {
      await createSRPReport(props.flawId, data);
    }
    await loadSRPReports();
  } catch (err) {
    console.error('Failed to save SRP report:', err);
  }
}

async function handleSaveMilestone(data: Partial<SRPReportMilestone>) {
  if (editingMilestone.value) {
    await updateSRPMilestone(editingMilestone.value.srp_report, editingMilestone.value.uuid, data);
  } else {
    await createAdditionalInfoMilestone(editingReportUuid.value, data);
  }
  await loadSRPReports();
}

function hasMissingFields(report: SRPReport): boolean {
  return Boolean(report.missing_required_fields && report.missing_required_fields.trim());
}
</script>

<template>
  <LabelCollapsible
    class="my-2"
    :isExpanded="isExpanded"
    @toggle-expanded="isExpanded = !isExpanded"
  >
    <template #label>
      <span class="section-label">CRA: SRP Reporting</span>
      <span v-if="summary.overdueMilestones > 0" class="badge bg-danger ms-2">
        {{ summary.overdueMilestones }} Overdue
      </span>
    </template>

    <div v-if="isLoading" class="d-flex justify-content-center p-4">
      <LoadingSpinner type="border" />
    </div>

    <div v-else-if="error" class="alert alert-warning m-3">
      <i class="bi bi-exclamation-triangle me-2"></i>
      Failed to load SRP reports. The feature may not be available yet.
    </div>

    <div v-else class="p-3">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h6 class="mb-0">SRP Reports</h6>
        <button type="button" class="btn btn-sm btn-primary" @click="openAddReportDialog">
          <i class="bi bi-plus-circle me-1"></i>
          Add Report
        </button>
      </div>

      <div v-if="!summary.hasReport" class="text-muted">
        <i class="bi bi-info-circle me-2"></i>
        No reports yet. Click "Add Report" to create one.
      </div>

      <div v-else class="table-responsive">
        <table class="table table-sm table-hover">
          <thead>
            <tr>
              <th style="width: 40px"></th>
              <th>Status</th>
              <th>Event Type</th>
              <th>Next Due Date</th>
              <th>Overdue</th>
              <th style="width: 100px">Actions</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="report in srpReports" :key="report.uuid">
              <tr
                class="report-row"
                role="button"
                tabindex="0"
                :aria-expanded="isReportExpanded(report.uuid)"
                @click="toggleReportExpanded(report.uuid)"
                @keydown="handleReportKeydown($event, report.uuid)"
              >
                <td>
                  <i
                    class="bi"
                    :class="isReportExpanded(report.uuid) ? 'bi-chevron-down' : 'bi-chevron-right'"
                  ></i>
                </td>
                <td>
                  <SRPStatusBadge :status="report.status" />
                </td>
                <td>{{ formatEventType(report.reportable_event_type) }}</td>
                <td>{{ formatDateDisplay(getNextDueDate(report)) }}</td>
                <td>
                  <span v-if="getOverdueMilestones(report) > 0" class="badge bg-danger">
                    {{ getOverdueMilestones(report) }}
                  </span>
                  <span v-else class="text-muted">-</span>
                  <span
                    v-if="hasMissingFields(report)"
                    class="badge bg-warning text-dark ms-1"
                    title="Missing required fields"
                  >
                    <i class="bi bi-exclamation-triangle"></i>
                  </span>
                </td>
                <td @click.stop>
                  <button
                    type="button"
                    class="btn btn-sm btn-outline-primary me-1"
                    title="View Payload"
                    @click="openViewPayload(report)"
                  >
                    <i class="bi bi-eye"></i>
                  </button>
                  <button
                    type="button"
                    class="btn btn-sm btn-outline-secondary"
                    @click="openEditReportDialog(report)"
                  >
                    <i class="bi bi-pencil"></i>
                  </button>
                </td>
              </tr>
              <tr v-if="isReportExpanded(report.uuid)" class="milestone-details">
                <td colspan="6" class="p-0">
                  <SRPReportDetails
                    :report="report"
                    @add-milestone="openAddMilestoneDialog"
                    @edit-milestone="openEditMilestoneDialog"
                    @refresh="loadSRPReports"
                  />
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>
  </LabelCollapsible>

  <SRPReportDialog
    :report="editingReport"
    :show="showReportDialog"
    @close="closeReportDialog"
    @save="handleSaveReport"
  />

  <SRPMilestoneDialog
    :milestone="editingMilestone"
    :show="showMilestoneDialog"
    @close="closeMilestoneDialog"
    @save="handleSaveMilestone"
  />

  <SRPPayloadDialog
    :report="viewPayloadReport"
    :show="showPayloadDialog"
    @close="closePayloadDialog"
  />
</template>

<style scoped>
.section-label {
  font-weight: 600;
}

.report-row {
  cursor: pointer;
}

.report-row:hover {
  background-color: rgb(0 0 0 / 2.5%);
}

.milestone-details td {
  border-top: none;
}
</style>
