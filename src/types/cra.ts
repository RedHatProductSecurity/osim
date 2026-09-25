// SRP types for CRA compliance

// ── SRP field spec types ─────────────────────────────────────────────────────
// "required" | "required_if_available" | "optional" | "na"
// Columns: 24h, 72h, final
export type SRPFieldRequirement = 'na' | 'optional' | 'required' | 'required_if_available';
export type SRPFieldType = 'date' | 'datetime-local' | 'text' | 'textarea';

export interface SRPFieldSpec {
  '24h': SRPFieldRequirement;
  '72h': SRPFieldRequirement;
  'final': SRPFieldRequirement;
  'isList'?: true;   // value is a comma-separated list → saved as string[]
  'key': string;
  'label': string;
  'scope': 'aev' | 'common' | 'si';
  'type': SRPFieldType;
}

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
  | 'final';

export interface SRPReportMilestonePayloadField {
  editable: boolean;
  input_type: string;
  key: string;
  label: string;
  missing: boolean;
  options?: string[];
  requirement: 'copied_or_updated' | 'not_applicable' | 'optional' | 'required' | 'required_if_available';
  section: string;
  source: 'generated' | 'manual_override';
  value: unknown;
}

export interface SRPReportMilestone {
  acl_read: string[];
  acl_write: string[];
  additional_details?: Record<string, any>; // Added in OSIDB-5482
  additional_information_requests?: AdditionalInformationRequest[]; // Nested AIRs
  created_dt: string;
  days_remaining: null | number;
  due_at: null | string;
  generated_payload?: null | Record<string, any>;
  hours_remaining: null | number;
  is_overdue: boolean;
  manual_completion_notes: string;
  milestone_type: SRPMilestoneType;
  missing_conditionally_required_fields?: string[];
  missing_required_fields: string;
  owner?: null | string; // Added in OSIDB-5439
  payload_fields?: SRPReportMilestonePayloadField[];
  payload_prepared_at?: null | string;
  rejected_override_keys?: string[];
  request_received_at: null | string;
  request_source: string;
  request_text: string;
  response_text?: string; // Added in OSIDB-5621
  srp_report: string;
  status: SRPMilestoneStatus; // Updated in OSIDB-5442
  submitted_at?: null | string; // Added in OSIDB-5439
  updated_dt: string;
  uuid: string;
}

// Additional Information Request - nested under milestones (OSIDB refactor)
export interface AdditionalInformationRequest {
  acl_read: string[];
  acl_write: string[];
  created_dt: string;
  days_remaining: null | number;
  due_at: null | string;
  hours_remaining: null | number;
  is_overdue: boolean;
  manual_completion_notes: string;
  manual_due_at: null | string;
  milestone: string; // UUID of parent milestone (read-only)
  owner: string;
  request_received_at: null | string;
  request_source: string;
  request_text: string;
  response_text: string;
  status: SRPMilestoneStatus;
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
// Order: 24h, 72h, final (AIRs are now nested within each milestone)
export function sortMilestones(milestones: SRPReportMilestone[]): SRPReportMilestone[] {
  const milestoneOrder: Record<string, number> = {
    '24h': 1,
    '72h': 2,
    'final': 3,
  };

  return [...milestones].sort((a, b) => {
    return (milestoneOrder[a.milestone_type] || 99) - (milestoneOrder[b.milestone_type] || 99);
  });
}

// Helper function to sort AIRs within a milestone by creation date
export function sortAIRs(airs: AdditionalInformationRequest[]): AdditionalInformationRequest[] {
  return [...airs].sort((a, b) =>
    new Date(a.created_dt).getTime() - new Date(b.created_dt).getTime(),
  );
}
