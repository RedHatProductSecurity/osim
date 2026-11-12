import { mount } from '@vue/test-utils';

import type { ZodAffectType } from '@/types';

import ProvenanceBadge from '../ProvenanceBadge.vue';

function affect(overrides: Partial<ZodAffectType> = {}): ZodAffectType {
  return {
    uuid: 'c9a30a23-1c9e-4d3f-b1d9-53bfe5df7420',
    ...overrides,
  } as ZodAffectType;
}

const mountBadge = (affectToRender: ZodAffectType, iconOnly = false) =>
  mount(ProvenanceBadge, { props: { affect: affectToRender, iconOnly } });

describe('provenanceBadge', () => {
  it('renders the icon and the visible label text by default', () => {
    const wrapper = mountBadge(affect({ created_by: 'analyst@redhat.com' }));

    const badge = wrapper.find('.badge');
    expect(badge.text()).toBe('Human');
    expect(badge.find('i').classes()).toContain('bi-person-fill');
    expect(badge.classes()).toContain('bg-success');
    expect(badge.attributes('aria-label')).toBe('Human');
    expect(badge.attributes('title')).toBe('Created by a user');
    expect(badge.attributes('data-bs-toggle')).toBe('tooltip');
  });

  it('renders no visible text in icon-only mode but keeps the category in the aria-label', () => {
    const wrapper = mountBadge(affect({ created_by: 'AffectCreationEngine' }), true);

    const badge = wrapper.find('.badge');
    expect(badge.text()).toBe('');
    expect(badge.find('i').classes()).toContain('bi-robot');
    expect(badge.classes()).toContain('bg-secondary');
    expect(badge.attributes('aria-label')).toBe('ACE automation');
    expect(badge.attributes('title')).toBe('Created automatically by the Affect Creation Engine (ACE)');
    expect(badge.attributes('data-bs-toggle')).toBe('tooltip');
  });

  it('keeps whitespace between the icon and the label text by default', () => {
    const wrapper = mountBadge(affect({ created_by: 'analyst@redhat.com' }));

    expect(wrapper.find('.badge').element.textContent).toBe(' Human');
  });
});
