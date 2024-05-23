import { ZodFlawSchema } from '@/types/zodFlaw';
import { fieldsFor } from '@/types/zodShared';

const fieldsMapping: Record<string, string | string[]> = {
  classification: 'workflow_state',
  cvss_scores: ['cvss_scores__score', 'cvss_scores__vector'],
  affects: ['affects__ps_module', 'affects__ps_component'],
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
];

export const flawFields = fieldsFor(ZodFlawSchema)
  .filter((field) => includedFields.includes(field))
  .flatMap((field) => fieldsMapping[field] || field)
  .sort();
