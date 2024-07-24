import { mount } from '@vue/test-utils';
import AffectsTrackers from '@/components/AffectsTrackers.vue';
import { mockAffect } from './test-suite-helpers';
import { LoadingAnimationDirective } from '@/directives/LoadingAnimationDirective.js';

vi.mock('@/composables/useTrackers', () => ({
  useTrackers: () => ({
    alreadyFiledTrackers: [],
    untrackableAffects: [
      mockAffect({ ps_module: 'Module 1', ps_component: 'Component 1' }),
    ],
    trackersToFile: [],
    getUpdateStreamsFor: vi.fn(() => []),
  }),
}));

describe('Trackers Manager', () => {
  const defaultMountOptions = {
    global: {
      stubs: {
      },
    },
    directives: {
      'osim-loading': LoadingAnimationDirective,
    },
    props: {
      theAffects: [
        mockAffect({ ps_module: 'Module 1', ps_component: 'Component 1' }),
        mockAffect({ ps_module: 'Module 1', ps_component: 'Component 2' }),
        mockAffect({ ps_module: 'Module 2', ps_component: 'Component 1' }),
      ],
      affectsToDelete: [],
      error: null,
      flawId: '[[TEST]] flaw-id',
    }
  };

  describe('Baseline functionality', () => {
    it('renders the component', () => {
      const wrapper = mount(AffectsTrackers, defaultMountOptions);
      expect(wrapper.exists()).toBeTruthy();
    });
  });


  describe('Trackers listing', () => {
    it('shows an alert when tracker(s) are unavailable', () => {
      const wrapper = mount(AffectsTrackers, defaultMountOptions);
      const warning = wrapper.find('.alert-danger');
      expect(warning.exists()).toBeTruthy();
    });

    it('shows which trackers are not available', () => {
      const wrapper = mount(AffectsTrackers, defaultMountOptions);
      const warning = wrapper.find('.alert-danger');
      expect(warning.html().includes('Module 1/Component 1')).toBeTruthy();
    });
  });

});
