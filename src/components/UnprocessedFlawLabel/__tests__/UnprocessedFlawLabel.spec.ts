import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { DateTime } from 'luxon';

import { FlawClassificationStateEnum } from '@/generated-client';
import type { ZodFlawType } from '@/types';

import UnprocessedFlawLabel from '../UnprocessedFlawLabel.vue';

describe('unprocessedFlawLabel', () => {
  it('shows label for unprocessed flaw', () => {
    const flaw = {
      uuid: 'test-uuid',
      classification: { state: FlawClassificationStateEnum.New, workflow: 'test' },
      cve_id: 'CVE-2024-1234',
      created_dt: DateTime.now().minus({ hours: 1 }).toISO(),
      aegis_meta: null,
    } as ZodFlawType;

    const wrapper = mount(UnprocessedFlawLabel, {
      props: { flaw },
    });

    expect(wrapper.find('.unprocessed-flaw-label').exists()).toBe(true);
    expect(wrapper.text()).toContain('Pending Bot Processing');
  });

  it('hides label for processed flaw', () => {
    const flaw = {
      uuid: 'test-uuid',
      classification: { state: FlawClassificationStateEnum.Done, workflow: 'test' },
      cve_id: 'CVE-2024-1234',
      created_dt: DateTime.now().minus({ hours: 25 }).toISO(),
      aegis_meta: null,
    } as ZodFlawType;

    const wrapper = mount(UnprocessedFlawLabel, {
      props: { flaw },
    });

    expect(wrapper.find('.unprocessed-flaw-label').exists()).toBe(false);
  });

  it('applies badge variant styling', () => {
    const flaw = {
      uuid: 'test-uuid',
      classification: { state: FlawClassificationStateEnum.New, workflow: 'test' },
      cve_id: 'CVE-2024-1234',
      created_dt: DateTime.now().minus({ hours: 1 }).toISO(),
      aegis_meta: null,
    } as ZodFlawType;

    const wrapper = mount(UnprocessedFlawLabel, {
      props: { flaw, variant: 'badge' },
    });

    const label = wrapper.find('.unprocessed-flaw-label');
    expect(label.classes()).toContain('badge');
  });

  it('applies inline variant styling', () => {
    const flaw = {
      uuid: 'test-uuid',
      classification: { state: FlawClassificationStateEnum.New, workflow: 'test' },
      cve_id: 'CVE-2024-1234',
      created_dt: DateTime.now().minus({ hours: 1 }).toISO(),
      aegis_meta: null,
    } as ZodFlawType;

    const wrapper = mount(UnprocessedFlawLabel, {
      props: { flaw, variant: 'inline' },
    });

    const label = wrapper.find('.unprocessed-flaw-label');
    expect(label.classes()).toContain('inline');
  });
});
