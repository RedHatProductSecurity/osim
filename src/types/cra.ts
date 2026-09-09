// SRP types for CRA compliance
// Note: These are manually defined because the generated OSIDB client types use 'any' for all fields.
// Once the OSIDB schema is finalized and the generator produces proper types, we can switch to using those.

// Backend statuses updated as of OSIDB-5442
export type SRPReportStatus =
  | 'empty'
  | 'in_progress'
  | 'submitted';

// Milestone statuses updated as of OSIDB-5442
export type SRPMilestoneStatus =
  | 'in_progress'
  | 'in_review'
  | 'obsolete'
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
  additional_details?: Record<string, any>; // Added in OSIDB-5482
  created_dt: string;
  days_remaining: null | number;
  due_at: null | string;
  hours_remaining: null | number;
  is_overdue: boolean;
  manual_completion_notes: string;
  milestone_type: SRPMilestoneType;
  missing_required_fields: string;
  owner?: null | string; // Added in OSIDB-5439
  request_received_at: null | string;
  request_source: string;
  request_text: string;
  srp_report: string;
  status: SRPMilestoneStatus; // Updated in OSIDB-5442
  submitted_at?: null | string; // Added in OSIDB-5439
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
  srp_reference_id: string; // Optional on creation (OSIDB-5436)
  srp_reference_url: string; // Optional on creation (OSIDB-5436)
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
    && milestone.status !== 'obsolete';
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
