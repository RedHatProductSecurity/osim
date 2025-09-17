import { nextTick } from 'vue';

import { mount } from '@vue/test-utils';

import DropDownMenu from '@/widgets/DropDownMenu/DropDownMenu.vue';

const createWrapper = (props = {}) => {
  return mount(DropDownMenu, {
    props,
    slots: {
      trigger: '<button data-testid="trigger">Open Menu</button>',
      content: '<div data-testid="content">Menu Content</div>',
    },
    global: {
      stubs: {
        Teleport: true,
      },
    },
  });
};

describe('dropDownMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('basic functionality', () => {
    it('renders correctly when closed', () => {
      const wrapper = createWrapper();

      expect(wrapper.find('[data-testid="trigger"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="content"]').exists()).toBe(false);
      expect(wrapper.find('.dropdown-backdrop').exists()).toBe(false);
    });

    it('opens dropdown when trigger is clicked', async () => {
      const wrapper = createWrapper();

      await wrapper.find('[data-testid="trigger"]').trigger('click');
      await nextTick();

      expect(wrapper.find('[data-testid="content"]').exists()).toBe(true);
      expect(wrapper.find('.dropdown-backdrop').exists()).toBe(true);
    });

    it('closes dropdown when trigger is clicked again', async () => {
      const wrapper = createWrapper();

      await wrapper.find('[data-testid="trigger"]').trigger('click');
      await nextTick();
      expect(wrapper.find('[data-testid="content"]').exists()).toBe(true);

      await wrapper.find('[data-testid="trigger"]').trigger('click');
      await nextTick();
      expect(wrapper.find('[data-testid="content"]').exists()).toBe(false);
    });

    it('closes dropdown when backdrop is clicked', async () => {
      const wrapper = createWrapper();

      await wrapper.find('[data-testid="trigger"]').trigger('click');
      await nextTick();
      expect(wrapper.find('[data-testid="content"]').exists()).toBe(true);

      await wrapper.find('.dropdown-backdrop').trigger('click');
      await nextTick();
      expect(wrapper.find('[data-testid="content"]').exists()).toBe(false);
    });

    it('does not close when dropdown content is clicked', async () => {
      const wrapper = createWrapper();

      await wrapper.find('[data-testid="trigger"]').trigger('click');
      await nextTick();

      await wrapper.find('[data-testid="content"]').trigger('click');
      await nextTick();
      expect(wrapper.find('[data-testid="content"]').exists()).toBe(true);
    });
  });

  describe('events', () => {
    it('emits open event when dropdown opens', async () => {
      const wrapper = createWrapper();

      await wrapper.find('[data-testid="trigger"]').trigger('click');

      expect(wrapper.emitted('open')).toBeTruthy();
      expect(wrapper.emitted('open')).toHaveLength(1);
    });

    it('emits close event when dropdown closes', async () => {
      const wrapper = createWrapper();

      await wrapper.find('[data-testid="trigger"]').trigger('click');
      await wrapper.find('[data-testid="trigger"]').trigger('click');

      expect(wrapper.emitted('close')).toBeTruthy();
      expect(wrapper.emitted('close')).toHaveLength(1);
    });

    it('emits close event when backdrop is clicked', async () => {
      const wrapper = createWrapper();

      await wrapper.find('[data-testid="trigger"]').trigger('click');
      await wrapper.find('.dropdown-backdrop').trigger('click');

      expect(wrapper.emitted('close')).toBeTruthy();
    });
  });

  describe('props', () => {
    it('accepts placement prop', () => {
      const wrapper = createWrapper({ placement: 'top-end' });
      expect(wrapper.props().placement).toBe('top-end');
    });

    it('accepts offset prop', () => {
      const wrapper = createWrapper({ offset: 16 });
      expect(wrapper.props().offset).toBe(16);
    });

    it('uses default props when not provided', () => {
      const wrapper = createWrapper();
      expect(wrapper.props().placement).toBe('bottom-start');
      expect(wrapper.props().offset).toBe(8);
    });
  });

  describe('exposed methods', () => {
    it('exposes isOpen reactive property', async () => {
      const wrapper = createWrapper();

      expect(wrapper.vm.isOpen).toBe(false);

      await wrapper.find('[data-testid="trigger"]').trigger('click');
      expect(wrapper.vm.isOpen).toBe(true);

      await wrapper.find('[data-testid="trigger"]').trigger('click');
      expect(wrapper.vm.isOpen).toBe(false);
    });

    it('exposes open method', async () => {
      const wrapper = createWrapper();

      expect(wrapper.vm.isOpen).toBe(false);

      await wrapper.vm.open();
      await nextTick();

      expect(wrapper.vm.isOpen).toBe(true);
      expect(wrapper.find('[data-testid="content"]').exists()).toBe(true);
    });

    it('exposes close method', async () => {
      const wrapper = createWrapper();

      await wrapper.vm.open();
      await nextTick();
      expect(wrapper.vm.isOpen).toBe(true);

      wrapper.vm.close();
      await nextTick();

      expect(wrapper.vm.isOpen).toBe(false);
      expect(wrapper.find('[data-testid="content"]').exists()).toBe(false);
    });

    it('exposes toggle method', async () => {
      const wrapper = createWrapper();

      expect(wrapper.vm.isOpen).toBe(false);

      await wrapper.vm.toggle();
      await nextTick();
      expect(wrapper.vm.isOpen).toBe(true);

      await wrapper.vm.toggle();
      await nextTick();
      expect(wrapper.vm.isOpen).toBe(false);
    });
  });

  describe('slot integration', () => {
    it('passes isOpen state to trigger slot', async () => {
      const wrapper = mount(DropDownMenu, {
        slots: {
          trigger: `<button :class="{ active: isOpen }" data-testid="trigger">
            {{ isOpen ? "Close" : "Open" }} Menu
          </button>`,
          content: '<div data-testid="content">Menu Content</div>',
        },
        global: {
          stubs: {
            Teleport: true,
          },
        },
      });

      const trigger = wrapper.find('[data-testid="trigger"]');
      expect(trigger.text()).toBe('Open Menu');
      expect(trigger.classes()).not.toContain('active');

      await trigger.trigger('click');
      await nextTick();

      expect(trigger.text()).toBe('Close Menu');
      expect(trigger.classes()).toContain('active');
    });

    it('passes close method to content slot', async () => {
      const wrapper = mount(DropDownMenu, {
        slots: {
          trigger: '<button data-testid="trigger">Open Menu</button>',
          content: '<div data-testid="content"><button @click="close" data-testid="close-btn">Close</button></div>',
        },
        global: {
          stubs: {
            Teleport: true,
          },
        },
      });

      await wrapper.find('[data-testid="trigger"]').trigger('click');
      await nextTick();

      expect(wrapper.find('[data-testid="content"]').exists()).toBe(true);

      await wrapper.find('[data-testid="close-btn"]').trigger('click');
      await nextTick();

      expect(wrapper.find('[data-testid="content"]').exists()).toBe(false);
      expect(wrapper.emitted('close')).toBeTruthy();
    });
  });

  describe('window event listeners', () => {
    let addEventListenerSpy: any;
    let removeEventListenerSpy: any;

    beforeEach(() => {
      addEventListenerSpy = vi.spyOn(window, 'addEventListener');
      removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('adds window event listeners on mount', () => {
      createWrapper();

      expect(addEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function), true);
    });

    it('removes window event listeners on unmount', () => {
      const wrapper = createWrapper();

      wrapper.unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function), true);
    });
  });
});
