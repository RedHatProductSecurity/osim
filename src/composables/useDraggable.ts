import { ref, type Ref, nextTick, watchEffect } from 'vue';

// Prevent typescript error
declare global {
  interface Element {
    dataset: {
      index: string
    }
  }
}

export function useDraggable<K>(elDragZone: Ref<HTMLElement | null>,
  items: Ref<K[]>,
  transitionClass: string = 'draggable') {
  const draggableItems = ref(items.value) as Ref<K[]>;
  const draggableClass = ref<string | undefined>();
  const elDraggable = ref();
  const destKey = ref();


  watchEffect(() => {
    draggableItems.value = items.value;
  });

  function dragStart(event: DragEvent) {
    const element = event.target as HTMLElement;
    element.classList.add('dragging');
    elDraggable.value = element;
  }

  function dragEnd(event: DragEvent) {
    const element = event.target as HTMLElement;
    element.classList.remove('dragging');
    draggableClass.value = transitionClass;
    nextTick(() => {
      const sourceKey = elDraggable.value.dataset.index;
      const sourceValue = draggableItems.value[sourceKey];

      draggableItems.value.splice(sourceKey, 1);
      draggableItems.value.splice(destKey.value, 0, sourceValue);

      items.value = draggableItems.value;
      elDraggable.value = null;

      nextTick(() => {
        draggableClass.value = undefined;

        if (!elDragZone.value) return;
        Array.from(elDragZone.value.children).forEach((child) => child.classList.remove('ms-5'));
      });
    });
  }

  function dragOver(event: DragEvent) {
    if (!elDragZone.value) return;

    const childs = Array.from(elDragZone.value.children)
      .filter((child) => ['no-drag'].every((c) => !child.classList.contains(c)));


    const predecesor = childs.reduce((closest, child) => {
      const box = child.getBoundingClientRect();

      const offset = event.clientX - box.left - box.width / 2;

      if (offset < 0 && offset > closest.offset) {
        return { offset, element: child };
      } else {
        return closest;
      }
    }, { offset: Number.NEGATIVE_INFINITY, element: null } as { offset: number, element: Element | null }).element;


    if (predecesor) {
      destKey.value = predecesor.dataset.index;
      childs.forEach((child) => child.classList.remove('ms-5'));
      if (!predecesor.classList.contains('dragging')) {
        predecesor.classList.add('ms-5');
      }
    } else {
      destKey.value = draggableItems.value.length - 1;
    }
  }
  return {
    draggableItems,
    draggableClass,
    dragStart,
    dragEnd,
    dragOver
  };

}
