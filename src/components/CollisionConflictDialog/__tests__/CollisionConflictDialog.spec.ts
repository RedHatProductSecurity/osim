import { mount } from '@vue/test-utils';

import CollisionConflictDialog from '../CollisionConflictDialog.vue';

const conflicts = [
  { id: 'title', label: 'Title', mine: 'analyst title', server: 'bot title' },
  { id: 'impact', label: 'Impact', mine: 'LOW', server: 'MODERATE' },
];

function mountDialog() {
  return mount(CollisionConflictDialog, {
    props: { conflicts, show: true },
  });
}

describe('collision conflict dialog', () => {
  it('lists each conflict and confirms the selected side', async () => {
    const wrapper = mountDialog();

    expect(wrapper.text()).toContain('Title');
    expect(wrapper.text()).toContain('analyst title');
    expect(wrapper.text()).toContain('bot title');
    expect(wrapper.get('.modal-footer .btn-primary').attributes('disabled')).toBeDefined();

    await wrapper.get('[aria-label="Keep your Title"]').trigger('click');
    await wrapper.get('[aria-label="Keep the server Impact"]').trigger('click');
    await wrapper.get('.modal-footer .btn-primary').trigger('click');

    expect(wrapper.emitted('confirm')?.[0]).toEqual([{
      title: 'mine',
      impact: 'server',
    }]);
  });

  it('can keep every server value', async () => {
    const wrapper = mountDialog();

    const keepAll = wrapper.findAll('button.conflict-keep-all');
    await keepAll[1].trigger('click');
    await wrapper.get('.modal-footer .btn-primary').trigger('click');

    expect(wrapper.emitted('confirm')?.[0]).toEqual([{
      title: 'server',
      impact: 'server',
    }]);
  });

  it('selects a side when its frame is clicked', async () => {
    const wrapper = mountDialog();

    const frames = wrapper.findAll('button.conflict-side');
    await frames[0].trigger('click');
    await frames[3].trigger('click');
    await wrapper.get('.modal-footer .btn-primary').trigger('click');

    expect(wrapper.emitted('confirm')?.[0]).toEqual([{
      title: 'mine',
      impact: 'server',
    }]);
  });

  it('does not confirm again while a save is in flight', async () => {
    const wrapper = mount(CollisionConflictDialog, {
      props: { conflicts, saving: true, show: true },
    });

    await wrapper.get('[aria-label="Keep your Title"]').trigger('click');
    await wrapper.get('[aria-label="Keep the server Impact"]').trigger('click');
    await wrapper.get('.modal-footer .btn-primary').trigger('click');

    expect(wrapper.get('.modal-footer .btn-primary').attributes('disabled')).toBeDefined();
    expect(wrapper.emitted('confirm')).toBeUndefined();
  });

  it('keeps one summary for many affects and still allows a single override', async () => {
    const rows = [
      {
        id: 'a:impact',
        label: 'rhel-9 · rhel-9 · kernel',
        detail: 'Analyzed component: pkg:rpm/kernel',
        mine: 'LOW',
        server: 'MODERATE',
      },
      { id: 'b:impact', label: 'openssl (rhel-9)', mine: 'LOW', server: 'MODERATE' },
      { id: 'c:impact', label: 'glibc (rhel-8)', mine: 'LOW', server: 'IMPORTANT' },
      { id: 'd:impact', label: 'httpd (rhel-8)', mine: 'LOW', server: 'MODERATE' },
    ];
    const wrapper = mount(CollisionConflictDialog, {
      props: {
        conflicts: [{
          id: 'affect-field:impact',
          label: 'Impact · 4 affects',
          mine: 'LOW',
          rows,
          server: 'MODERATE (3)\nIMPORTANT (1)',
        }],
        show: true,
      },
    });

    expect(wrapper.text()).toContain('Impact · 4 affects');
    expect(wrapper.text()).not.toContain('rhel-9 · rhel-9 · kernel');

    await wrapper.get('[aria-label="Keep your Impact · 4 affects"]').trigger('click');
    await wrapper.get('.conflict-expand').trigger('click');
    expect(wrapper.get('.conflict-affect-label').attributes('title')).toBe(
      'Analyzed component: pkg:rpm/kernel',
    );
    expect(wrapper.text()).toContain('rhel-9 · rhel-9 · kernel');

    await wrapper.get('[aria-label="Keep the server openssl (rhel-9)"]').trigger('click');
    await wrapper.get('.modal-footer .btn-primary').trigger('click');

    expect(wrapper.emitted('confirm')?.[0]).toEqual([{
      'a:impact': 'mine',
      'b:impact': 'server',
      'c:impact': 'mine',
      'd:impact': 'mine',
    }]);
  });

  it('closes without a choice when cancelled', async () => {
    const wrapper = mountDialog();

    await wrapper.get('.modal-footer .btn-secondary').trigger('click');

    expect(wrapper.emitted('cancel')).toHaveLength(1);
    expect(wrapper.emitted('confirm')).toBeUndefined();
  });
});
