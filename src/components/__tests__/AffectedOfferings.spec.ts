import { mount } from '@vue/test-utils';
import AffectedOfferings from '@/components/AffectedOfferings.vue';
import { mockAffect } from './test-suite-helpers';

// const mockError = () => ({
//   ps_module:null,
//   ps_component:null,
//   embargoed:null,
//   trackers:[null],
//   cvss_scores: [null]
// });

describe('AffectedOfferings', () => {
  it('renders the affected offerings', () => {
    const subject = mount(AffectedOfferings, {
      global: {
        stubs: {
          RouterLink: true,
        },
      },
      props: {
        theAffects: [
          mockAffect({ ps_module: 'Module 1', ps_component: 'Component 1' }),
          mockAffect({ ps_module: 'Module 1', ps_component: 'Component 2' }),
          mockAffect({ ps_module: 'Module 2', ps_component: 'Component 1' }),
        ],
        affectsToDelete: [],
        // error: [mockError(), mockError(), mockError()],
        error: null,
      },
    });

    expect(subject.findAll('.osim-affected-offering')).toHaveLength(3);
  });

  it('renders the Expand All button only when some affects are collapsed', async () => {
    const subject = mount(AffectedOfferings, {
      props: {
        theAffects: [
          mockAffect({ ps_module: 'Module 1', ps_component: 'Component 1' }),
          mockAffect({ ps_module: 'Module 1', ps_component: 'Component 2' }),
          mockAffect({ ps_module: 'Module 2', ps_component: 'Component 1' }),
        ],
        affectsToDelete: [],
        error: [],
      },
    });

    let expandButton = subject.findAll('button').find((button) => button.text().includes('Expand All'));
    expect(expandButton?.exists()).toBe(true);

    await expandButton?.trigger('click');

    expandButton = subject.findAll('button').find((button) => button.text().includes('Expand All'));
    expect(expandButton).toBe(undefined);
  });

  it('renders the Collapse All button only when some affects are expanded', async () => {
    const subject = mount(AffectedOfferings, {
      props: {
        theAffects: [
          mockAffect({ ps_module: 'Module 1', ps_component: 'Component 1' }),
          mockAffect({ ps_module: 'Module 1', ps_component: 'Component 2' }),
          mockAffect({ ps_module: 'Module 2', ps_component: 'Component 1' }),
        ],
        affectsToDelete: [],
        error: [],
      },
    });

    let collapseButton = subject.findAll('button').find((button) => button.text().includes('Collapse All'));
    expect(collapseButton).toBe(undefined);

    const expandButton = subject.findAll('button').find((button) => button.text().includes('Expand All'));
    await expandButton?.trigger('click');
    collapseButton = subject.findAll('button').find((button) => button.text().includes('Collapse All'));
    expect(collapseButton?.exists()).toBe(true);
  });

  it('expands and collapses modules', async () => {
    const subject = mount(AffectedOfferings, {
      props: {
        theAffects: [
          mockAffect({ ps_module: 'Module 1', ps_component: 'Component 1' }),
          mockAffect({ ps_module: 'Module 1', ps_component: 'Component 2' }),
          mockAffect({ ps_module: 'Module 2', ps_component: 'Component 1' }),
        ],
        affectsToDelete: [],
        error: [],
      },
    });

    const button = subject.find('button.osim-collapsible-toggle');

    // Module 1 starts collapsed
    expect(subject.find('.visually-hidden > .osim-affected-offering').exists()).toBe(true);

    // Expand Module 1
    await button.trigger('click');
    expect(subject.find('div:not(.visually-hidden) > .osim-affected-offering').exists()).toBe(true);

    // Collapse Module 1
    await button.trigger('click');
    expect(subject.find('.visually-hidden > .osim-affected-offering').exists()).toBe(true);
  });

  it('emits events when affecting components are removed or recovered', async () => {
    const subject = mount(AffectedOfferings, {
      props: {
        theAffects: [
          mockAffect({ ps_module: 'Module 1', ps_component: 'Component 1' }),
          mockAffect({ ps_module: 'Module 1', ps_component: 'Component 2' }),
        ],
        affectsToDelete: [
          mockAffect({ ps_module: 'Module 2', ps_component: 'Component 1' }),
        ],
        error: [],
      },
    });

    const removeButton = subject.find('button .bi-trash');
    const recoverButton = subject.find('.btn-success');

    // Remove affecting component
    await removeButton.trigger('click');

    expect(subject.emitted('affect:remove')?.[0][0]).toEqual(
      mockAffect({ ps_module: 'Module 1', ps_component: 'Component 1' })
    );

    // Recover affecting component
    await recoverButton.trigger('click');
    expect(subject.emitted('affect:recover')?.[0][0]).toEqual(
      mockAffect({ ps_module: 'Module 2', ps_component: 'Component 1' })
    );
  });

  it('renders the deleted affected offerings', () => {
    const subject = mount(AffectedOfferings, {
      global: {
        stubs: {
          RouterLink: true,
        },
      },
      props: {
        theAffects: [
          mockAffect({ ps_module: 'Module 1', ps_component: 'Component 1' }),
          mockAffect({ ps_module: 'Module 1', ps_component: 'Component 2' }),
        ],
        affectsToDelete: [
          mockAffect({ ps_module: 'Module 2', ps_component: 'Component 1' }),
        ],
        error: null,
      },
    });

    const deleteEL = subject.find('div.col-auto.alert.alert-danger');
    expect(deleteEL.exists()).toBeTruthy();
    const deleteMessageEL = deleteEL.find('h5');
    expect(deleteMessageEL.exists()).toBeTruthy();
    expect(deleteMessageEL.text()).toBe('Affected Offerings To Be Deleted');
  });

});
