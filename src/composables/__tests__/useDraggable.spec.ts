import { ref, type Ref } from 'vue';
import { useDraggable } from '../useDraggable';
import { flushPromises, mount } from '@vue/test-utils';

describe('useDraggable', () => {
  let items: Ref<string[]>;
  let elDragZone: Ref<HTMLElement>;
  let wrapper: ReturnType<typeof mount>;

  beforeEach(() => {
    items = ref(['test1', 'test2', 'test3']);
    const Comp = {
      props: ['items'],
      template: `<div ref="elDragZone">
      <span v-for="(value, index) in items" :data-index="index" :key="value">
        {{value}}
      </span>
      </div>`,
    };
    wrapper = mount(Comp, { props: { items: items.value } });
    elDragZone = ref(wrapper.vm.$refs.elDragZone) as Ref<HTMLElement>;
  });

  afterEach(() => {
    wrapper.unmount();
  });

  it('should return draggable items', () => {
    const { draggableItems } = useDraggable(elDragZone, items);

    expect(draggableItems.value).toEqual(['test1', 'test2', 'test3']);
  });

  it('should update draggableClass for transition', async () => {
    const { draggableClass, dragStart, dragEnd } = useDraggable(elDragZone, items);

    elDragZone.value.addEventListener('dragstart', dragStart);
    elDragZone.value.addEventListener('dragend', dragEnd);

    // Initial value is undefined
    expect(draggableClass.value).toBe(undefined);

    wrapper.trigger('dragstart');
    wrapper.trigger('dragend');
    // After drag, draggableClass should be 'draggable'
    expect(draggableClass.value).toEqual('draggable');

    await flushPromises();
    // Once the transition is done, draggableClass should be undefined
    expect(draggableClass.value).toBe(undefined);

  });

  it('should update draggable items after drag n drop', async () => {
    const { dragStart, dragEnd } = useDraggable(elDragZone, items);

    elDragZone.value.addEventListener('dragstart', dragStart);
    elDragZone.value.addEventListener('dragend', dragEnd);

    const secondChild = wrapper.findAll('span').at(1);
    const firstChild = wrapper.findAll('span').at(0);

    // Drag second child to first position
    await secondChild?.trigger('dragstart');
    await firstChild?.trigger('dragover');
    await secondChild?.trigger('dragend');


    expect(items.value).toEqual(['test2', 'test1', 'test3']);
  });
});
