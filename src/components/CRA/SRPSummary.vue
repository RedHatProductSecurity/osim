<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

import type { SRPReport, SRPReportSummary, SRPReportStatus } from '@/types/cra';
import { fetchSRPReports } from '@/services/SRPService';
import { formatDate } from '@/utils/helpers';
import LabelCollapsible from '@/widgets/LabelCollapsible/LabelCollapsible.vue';
import LoadingSpinner from '@/widgets/LoadingSpinner/LoadingSpinner.vue';

const props = defineProps<{
  flawId: string;
}>();

const STATUS_BADGE_MAP: Record<SRPReportStatus, string> = {
  blocked: 'bg-danger text-white',
  deferred: 'bg-secondary text-white',
  failed: 'bg-danger text-white',
  not_applicable: 'bg-light text-dark',
  not_required: 'bg-light text-dark',
  prepared: 'bg-info text-white',
  required: 'bg-warning text-dark',
  submitted: 'bg-success text-white',
};

const srpReports = ref<SRPReport[]>([]);
const isLoading = ref(false);
const error = ref(false);
const isExpanded = ref(true);

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
    .filter(m => m.due_at && new Date(m.due_at) > now)
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

function formatStatus(status: null | string | undefined): string {
  return status?.replace('_', ' ') ?? '';
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

    <div v-else-if="!summary.hasReport" class="p-3 text-muted">
      <i class="bi bi-info-circle me-2"></i>
      No SRP reporting required for this flaw.
    </div>

    <div v-else class="p-3">
      <div class="table-responsive">
        <table class="table table-sm table-hover">
          <thead>
            <tr>
              <th>Status</th>
              <th>Event Type</th>
              <th>Next Due Date</th>
              <th>Overdue</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="report in srpReports" :key="report.uuid">
              <td>
                <span class="badge" :class="STATUS_BADGE_MAP[report.status]">
                  {{ formatStatus(report.status) }}
                </span>
              </td>
              <td>{{ formatEventType(report.reportable_event_type) }}</td>
              <td>{{ formatDateDisplay(getNextDueDate(report)) }}</td>
              <td>
                <span v-if="getOverdueMilestones(report) > 0" class="badge bg-danger">
                  {{ getOverdueMilestones(report) }}
                </span>
                <span v-else class="text-muted">-</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </LabelCollapsible>
</template>

<style scoped>
.section-label {
  font-weight: 600;
}
</style>
