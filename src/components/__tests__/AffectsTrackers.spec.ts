import { mount } from '@vue/test-utils';
import AffectsTrackers from '@/components/AffectedOfferings.vue';
import { mockAffect } from './test-suite-helpers';

describe('Trackers for Affects Component', () => {
  it('renders the component', () => {
    const $AffectedOfferings = mount(AffectsTrackers, {
      global: {
        stubs: {
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

    expect($AffectedOfferings.exists()).toBeTruthy();

  });
});
