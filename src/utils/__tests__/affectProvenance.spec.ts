import type { ZodAffectType } from '@/types';

import { classifyAffectProvenance } from '../affectProvenance';

function affect(overrides: Partial<ZodAffectType> = {}): ZodAffectType {
  return {
    uuid: 'c9a30a23-1c9e-4d3f-b1d9-53bfe5df7420',
    ...overrides,
  } as ZodAffectType;
}

describe('classifyAffectProvenance', () => {
  it('classifies affects created by an automation tool as automation', () => {
    expect(classifyAffectProvenance(affect({ created_by: 'AffectCreationEngine' }))).toBe('automation');
  });

  it('lets the automation allowlist take precedence over assist metadata', () => {
    expect(classifyAffectProvenance(affect({
      assist_meta: { source: 'aegis' },
      created_by: 'AffectCreationEngine',
    }))).toBe('automation');
  });

  it('classifies user-created affects with assist metadata as hybrid', () => {
    expect(classifyAffectProvenance(affect({
      assist_meta: {},
      created_by: 'analyst@redhat.com',
    }))).toBe('hybrid');
    expect(classifyAffectProvenance(affect({
      assist_meta: { source: 'aegis' },
      created_by: 'analyst@redhat.com',
    }))).toBe('hybrid');
  });

  it('classifies user-created affects without assist metadata as human', () => {
    expect(classifyAffectProvenance(affect({ created_by: 'analyst@redhat.com' }))).toBe('human');
    expect(classifyAffectProvenance(affect({
      assist_meta: null,
      created_by: 'analyst@redhat.com',
    }))).toBe('human');
    expect(classifyAffectProvenance(affect({
      assist_meta: undefined,
      created_by: 'analyst@redhat.com',
    }))).toBe('human');
  });

  it('does not classify case-variants of automation tools as automation', () => {
    expect(classifyAffectProvenance(affect({ created_by: 'affectcreationengine' }))).toBe('human');
  });

  it('classifies affects without a created_by as legacy', () => {
    expect(classifyAffectProvenance(affect({ created_by: undefined }))).toBe('legacy');
    expect(classifyAffectProvenance(affect({ created_by: null }))).toBe('legacy');
    expect(classifyAffectProvenance(affect({ created_by: '' }))).toBe('legacy');
  });

  it('classifies uuid-less rows as human because the current user just created them', () => {
    expect(classifyAffectProvenance(affect({ uuid: undefined }))).toBe('human');
    expect(classifyAffectProvenance(affect({ created_by: undefined, uuid: undefined }))).toBe('human');
  });
});
