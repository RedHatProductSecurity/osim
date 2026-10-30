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

  it('closes without a choice when cancelled', async () => {
    const wrapper = mountDialog();

    await wrapper.get('.modal-footer .btn-secondary').trigger('click');

    expect(wrapper.emitted('cancel')).toHaveLength(1);
    expect(wrapper.emitted('confirm')).toBeUndefined();
  });
});
