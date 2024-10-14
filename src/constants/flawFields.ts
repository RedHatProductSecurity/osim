import { ZodFlawSchema } from '@/types/zodFlaw';
import { fieldsFor } from '@/types/zodShared';

const fieldsMapping: Record<string, string | string[]> = {
  classification: 'workflow_state',
  cvss_scores: ['cvss_scores__score', 'cvss_scores__vector'],
  affects: [
    'affects__ps_module',
    'affects__ps_component',
    'affects__affectedness',
  ],
  acknowledgments: 'acknowledgments__name',
  trackers: [
    'affects__trackers__errata__advisory_name',
    'affects__trackers__ps_update_stream',
    'affects__trackers__external_system_id',
  ],
  references: [],
  comments: [],
};

const includedFields = [
  'type',
  'uuid',
  'cve_id',
  'impact',
  'component',
  'title',
  'owner',
  'trackers',
  'classification',
  'cwe_id',
  'source',
  'affects',
  'comments',
  'cvss_scores',
  'references',
  'acknowledgments',
  'embargoed',
  'requires_cve_description',
  'cve_description',
  'mitigation',
  'statement',
  'major_incident_state',
];

export const flawFields = fieldsFor(ZodFlawSchema)
  .filter(field => includedFields.includes(field))
  .flatMap(field => fieldsMapping[field] || field)
  .sort();

export const flawFieldNamesMapping: Record<string, string> = {
  owner: 'Owner',
  title: 'Title',
  cve_id: 'CVE ID',
  cwe_id: 'CWE ID',
  impact: 'Impact',
  source: 'Source',
  statement: 'Statement',
  components: 'Components',
  mitigation: 'Mitigation',
  reported_dt: 'Reported Date',
  unembargo_dt: 'Public Date',
  cve_description: 'Description',
  major_incident_state: 'Incident State',
  major_incident_start_dt: 'Incident Start Date',
  requires_cve_description: 'Requires CVE Description',
};

export const allowedEmptyFieldMapping: Record<string, string> = {
  cve_id: 'cve_id__isempty',
  cvss_scores__score: 'cvss3_rh__isempty',
  cwe_id: 'cwe_id__isempty',
  owner: 'owner__isempty',
  cve_description: 'cve_description__isempty',
  mitigation: 'mitigation__isempty',
  statement: 'statement__isempty',
};
