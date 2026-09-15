import type { SRPEventType, SRPMilestoneType, SRPReportMilestonePayloadField } from '@/types/cra';

export type SRPPayloadMilestoneType = Exclude<SRPMilestoneType, 'additional_information_response'>;

export type SRPRequirement =
  | 'copied_or_updated'
  | 'not_applicable'
  | 'optional'
  | 'required'
  | 'required_if_available';

export interface SRPPayloadFieldRow extends SRPReportMilestonePayloadField {
  isMissing: boolean;
}

export const EU_MEMBER_STATES = [
  'AT',
  'BE',
  'BG',
  'CY',
  'CZ',
  'DE',
  'DK',
  'EE',
  'EL',
  'ES',
  'FI',
  'FR',
  'HR',
  'HU',
  'IE',
  'IT',
  'LT',
  'LU',
  'LV',
  'MT',
  'NL',
  'PL',
  'PT',
  'RO',
  'SE',
  'SI',
  'SK',
];

export function isPayloadRowEditable(row: SRPPayloadFieldRow): boolean {
  return row.editable;
}

export function isPayloadMilestoneType(milestoneType?: SRPMilestoneType): milestoneType is SRPPayloadMilestoneType {
  return milestoneType === '24h' || milestoneType === '72h' || milestoneType === 'final';
}

export function buildPayloadRows(milestone: { payload_fields?: SRPReportMilestonePayloadField[] }): SRPPayloadFieldRow[] {
  return (milestone.payload_fields || []).map(row => ({
    ...row,
    input_type: row.input_type === 'multi_select' ? 'multi-select' : row.input_type,
    isMissing: row.missing,
    options: row.options?.length ? row.options : undefined,
  }));
}

export function parseFieldList(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter(item => typeof item === 'string');
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.filter(item => typeof item === 'string');
  } catch {
    // Existing API values may be comma-separated plain text.
  }
  return value.split(',').map(item => item.trim()).filter(Boolean);
}

export function formatRequirement(requirement: SRPRequirement): string {
  switch (requirement) {
    case 'copied_or_updated':
      return 'Copied/updateable';
    case 'optional':
      return 'Optional';
    case 'required':
      return 'Required';
    case 'required_if_available':
      return 'Required if available';
    default:
      return 'Not applicable';
  }
}

export function requirementBadgeClass(requirement: SRPRequirement): string {
  switch (requirement) {
    case 'copied_or_updated':
      return 'bg-info text-dark';
    case 'optional':
      return 'bg-secondary';
    case 'required':
      return 'bg-danger';
    case 'required_if_available':
      return 'bg-warning text-dark';
    default:
      return 'bg-light text-dark';
  }
}

export function formatEventTypeLabel(eventType?: SRPEventType): string {
  if (eventType === 'EXPLOITS_KEV_APPROVED') return 'Actively Exploited Vulnerability';
  if (eventType === 'MAJOR_INCIDENT_APPROVED') return 'Severe Incident';
  if (eventType === 'ADDITIONAL_INFORMATION_REQUEST') return 'Additional Information Request';
  return 'N/A';
}

export function formatNotificationTypeValue(eventType?: SRPEventType): string {
  if (eventType === 'EXPLOITS_KEV_APPROVED') return 'Vulnerability';
  if (eventType === 'MAJOR_INCIDENT_APPROVED') return 'Incident';
  return 'N/A';
}

export function formatMilestoneTypeLabel(milestoneType?: SRPMilestoneType): string {
  if (milestoneType === '24h') return '24h Early Warning';
  if (milestoneType === '72h') return '72h Notification';
  if (milestoneType === 'final') return 'Final Report';
  if (milestoneType === 'additional_information_response') return 'Additional Information Response';
  return 'N/A';
}

export function isEmptyPayloadValue(value: unknown): boolean {
  return value === null
    || value === undefined
    || value === ''
    || (Array.isArray(value) && value.length === 0)
    || (typeof value === 'string' && value.trim() === '')
    || value === '[]';
}

export function formatPayloadValue(value: unknown): string {
  if (isEmptyPayloadValue(value)) return 'Not provided';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}
