import { describe, expect, it } from 'vitest';

import type { SRPReportMilestone } from '@/types/cra';
import { sortMilestones } from '@/types/cra';

const createMilestone = (
  type: string,
  createdDt: string = '2026-08-20T10:00:00Z',
): SRPReportMilestone => ({
  acl_read: [],
  acl_write: [],
  created_dt: createdDt,
  days_remaining: 5,
  due_at: '2026-08-25T10:00:00Z',
  hours_remaining: 120,
  is_overdue: false,
  manual_completion_notes: '',
  milestone_type: type as any,
  missing_required_fields: '',
  request_received_at: null,
  request_source: '',
  request_text: '',
  srp_report: 'report-uuid',
  status: 'prepared',
  updated_dt: '2026-08-20T10:00:00Z',
  uuid: `${type}-uuid`,
});

describe('sortMilestones', () => {
  it('sorts main milestones in correct order: 24h, 72h, final', () => {
    const milestones = [
      createMilestone('final'),
      createMilestone('24h'),
      createMilestone('72h'),
    ];

    const sorted = sortMilestones(milestones);

    expect(sorted[0].milestone_type).toBe('24h');
    expect(sorted[1].milestone_type).toBe('72h');
    expect(sorted[2].milestone_type).toBe('final');
  });

  it('places additional_information_response after main milestones', () => {
    const milestones = [
      createMilestone('additional_information_response'),
      createMilestone('24h'),
      createMilestone('72h'),
    ];

    const sorted = sortMilestones(milestones);

    expect(sorted[0].milestone_type).toBe('24h');
    expect(sorted[1].milestone_type).toBe('72h');
    expect(sorted[2].milestone_type).toBe('additional_information_response');
  });

  it('sorts multiple additional requests by creation date', () => {
    const milestones = [
      createMilestone('additional_information_response', '2026-08-22T10:00:00Z'),
      createMilestone('24h', '2026-08-20T09:00:00Z'),
      createMilestone('additional_information_response', '2026-08-21T10:00:00Z'),
    ];

    const sorted = sortMilestones(milestones);

    expect(sorted[0].milestone_type).toBe('24h');
    expect(sorted[1].milestone_type).toBe('additional_information_response');
    expect(sorted[1].created_dt).toBe('2026-08-21T10:00:00Z');
    expect(sorted[2].milestone_type).toBe('additional_information_response');
    expect(sorted[2].created_dt).toBe('2026-08-22T10:00:00Z');
  });

  it('handles empty array', () => {
    const sorted = sortMilestones([]);
    expect(sorted).toEqual([]);
  });

  it('handles single milestone', () => {
    const milestones = [createMilestone('24h')];
    const sorted = sortMilestones(milestones);
    expect(sorted.length).toBe(1);
    expect(sorted[0].milestone_type).toBe('24h');
  });

  it('handles only additional requests', () => {
    const milestones = [
      createMilestone('additional_information_response', '2026-08-23T10:00:00Z'),
      createMilestone('additional_information_response', '2026-08-21T10:00:00Z'),
      createMilestone('additional_information_response', '2026-08-22T10:00:00Z'),
    ];

    const sorted = sortMilestones(milestones);

    expect(sorted[0].created_dt).toBe('2026-08-21T10:00:00Z');
    expect(sorted[1].created_dt).toBe('2026-08-22T10:00:00Z');
    expect(sorted[2].created_dt).toBe('2026-08-23T10:00:00Z');
  });

  it('preserves original array (immutable)', () => {
    const milestones = [
      createMilestone('final'),
      createMilestone('24h'),
    ];

    const original = [...milestones];
    sortMilestones(milestones);

    expect(milestones).toEqual(original);
  });

  it('handles complete scenario with all milestone types', () => {
    const milestones = [
      createMilestone('additional_information_response', '2026-08-23T10:00:00Z'),
      createMilestone('final', '2026-08-20T12:00:00Z'),
      createMilestone('72h', '2026-08-20T11:00:00Z'),
      createMilestone('additional_information_response', '2026-08-22T10:00:00Z'),
      createMilestone('24h', '2026-08-20T10:00:00Z'),
    ];

    const sorted = sortMilestones(milestones);

    expect(sorted[0].milestone_type).toBe('24h');
    expect(sorted[1].milestone_type).toBe('72h');
    expect(sorted[2].milestone_type).toBe('final');
    expect(sorted[3].milestone_type).toBe('additional_information_response');
    expect(sorted[3].created_dt).toBe('2026-08-22T10:00:00Z');
    expect(sorted[4].milestone_type).toBe('additional_information_response');
    expect(sorted[4].created_dt).toBe('2026-08-23T10:00:00Z');
  });
});
