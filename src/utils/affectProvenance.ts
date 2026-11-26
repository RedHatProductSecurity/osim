import type { ZodAffectType } from '@/types';
import { AUTOMATION_CREATED_BY } from '@/constants';

export type AffectProvenance = 'automation' | 'human' | 'hybrid' | 'legacy';

export interface AffectProvenancePresentation {
  badgeClasses: string;
  icon: string;
  label: string;
  tooltip: string;
}

export const provenancePresentation: Record<AffectProvenance, AffectProvenancePresentation> = {
  automation: {
    label: 'ACE automation',
    icon: 'bi-robot',
    badgeClasses: 'bg-secondary',
    tooltip: 'Created automatically by the Affect Creation Engine (ACE)',
  },
  hybrid: {
    label: 'Hybrid (AI-assist)',
    icon: 'bi-person-workspace',
    badgeClasses: 'bg-info text-dark',
    tooltip: 'Created by a user with AI assistance',
  },
  human: {
    label: 'Human',
    icon: 'bi-person-fill',
    badgeClasses: 'bg-success',
    tooltip: 'Created by a user',
  },
  legacy: {
    label: 'Legacy',
    icon: 'bi-clock-history',
    badgeClasses: 'bg-light text-dark border',
    tooltip: 'Created before provenance was tracked',
  },
};

/**
 * Classify how an affect came to exist. Affects saved by an automation tool
 * (ACE) are automation-created, affects with assist metadata were created
 * with AI assistance, and affects without a created_by predate provenance
 * tracking. Affects without a uuid are new in-session rows the current user
 * just created.
 */
export function classifyAffectProvenance(affect: ZodAffectType): AffectProvenance {
  const { assist_meta, created_by, uuid } = affect;

  if (created_by && AUTOMATION_CREATED_BY.includes(created_by)) return 'automation';
  if (created_by && assist_meta != null) return 'hybrid';
  if (created_by) return 'human';
  return uuid ? 'legacy' : 'human';
}
