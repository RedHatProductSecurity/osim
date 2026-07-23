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
  | 'actively_exploited_vulnerability'
  | 'additional_information_request'
  | 'severe_incident';

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
  flaw_id: string;
  manufacturer_or_steward_name: string;
  member_states_available: string[];
  milestones: SRPReportMilestone[];
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
