// SRP types for CRA compliance
// Note: These are manually defined because the generated OSIDB client types use 'any' for all fields.
// Once the OSIDB schema is finalized and the generator produces proper types, we can switch to using those.

export type SRPReportStatus =
  | 'blocked'
  | 'deferred'
  | 'failed'
  | 'not_applicable'
  | 'not_required'
  | 'prepared'
  | 'required'
  | 'submitted';

export type SRPEventType =
  | 'ADDITIONAL_INFORMATION_REQUEST'
  | 'EXPLOITS_KEV_APPROVED'
  | 'MAJOR_INCIDENT_APPROVED';

export type SRPResponsibilityScope =
  | 'manufacturer'
  | 'steward';

export type SRPMilestoneType =
  | '24h'
  | '72h'
  | 'additional_information_response'
  | 'final';

export interface SRPReportMilestone {
  acl_read: string[];
  acl_write: string[];
  created_dt: string;
  days_remaining: null | number;
  due_at: null | string;
  hours_remaining: null | number;
  is_overdue: boolean;
  manual_completion_notes: string;
  milestone_type: SRPMilestoneType;
  missing_required_fields: string;
  owner?: null | string;
  request_received_at: null | string;
  request_source: string;
  request_text: string;
  srp_report: string;
  status: SRPReportStatus;
  updated_dt: string;
  uuid: string;
}

export interface SRPReport {
  created_dt: string;
  designated_csirt_country: string;
  designated_csirt_source: string;
  evidence: string;
  flaw_id: string;
  manufacturer_or_steward_name: string;
  member_states_available: string[];
  milestones: SRPReportMilestone[];
  missing_required_fields: string;
  reportable_event_type: SRPEventType;
  responsibility_scope: SRPResponsibilityScope;
  srp_reference_id: string;
  srp_reference_url: string;
  status: SRPReportStatus;
  timer_started_at: null | string;
  title: string;
  updated_dt: string;
  uuid: string;
}

export interface SRPReportSummary {
  eventType: null | SRPEventType;
  hasReport: boolean;
  nextDueDate: Date | null;
  overdueMilestones: number;
  status: null | SRPReportStatus;
}

// Helper function to determine if a milestone should be counted as actionable/overdue
export function isMilestoneActionable(milestone: SRPReportMilestone): boolean {
  return milestone.is_overdue
    && milestone.status !== 'submitted'
    && milestone.status !== 'not_required';
}

// Helper function to sort milestones in display order
// Order: 24h, 72h, final, then additional_information_response milestones
export function sortMilestones(milestones: SRPReportMilestone[]): SRPReportMilestone[] {
  const milestoneOrder: Record<string, number> = {
    '24h': 1,
    '72h': 2,
    'final': 3,
  };

  return [...milestones].sort((a, b) => {
    const aIsAdditional = a.milestone_type === 'additional_information_response';
    const bIsAdditional = b.milestone_type === 'additional_information_response';

    // If both are main milestones, sort by predefined order
    if (!aIsAdditional && !bIsAdditional) {
      return (milestoneOrder[a.milestone_type] || 99) - (milestoneOrder[b.milestone_type] || 99);
    }

    // Main milestones come before additional requests
    if (!aIsAdditional && bIsAdditional) return -1;
    if (aIsAdditional && !bIsAdditional) return 1;

    // Both are additional requests - sort by creation date (older first)
    return new Date(a.created_dt).getTime() - new Date(b.created_dt).getTime();
  });
}
