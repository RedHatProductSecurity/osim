import { ref } from 'vue';

export function useDragAndDrop(onReorder: (newOrder: string[]) => void) {
  const draggedItem = ref<null | string>(null);
  const dragOverIndex = ref<number>(-1);

  function onDragStart(event: DragEvent, itemId: string) {
    draggedItem.value = itemId;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', itemId);
    }
  }

  function onDragOver(event: DragEvent, index: number) {
    event.preventDefault();
    dragOverIndex.value = index;
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  function onDragLeave() {
    dragOverIndex.value = -1;
  }

  function onDrop(event: DragEvent, targetIndex: number, items: string[]) {
    event.preventDefault();

    if (!draggedItem.value) return;

    const draggedIndex = items.findIndex(itemId => itemId === draggedItem.value);

    if (draggedIndex === -1) return;

    const newOrder = [...items];
    const [removed] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, removed);

    onReorder(newOrder);

    draggedItem.value = null;
    dragOverIndex.value = -1;
  }

  function onDragEnd() {
    draggedItem.value = null;
    dragOverIndex.value = -1;
  }

  return {
    draggedItem,
    dragOverIndex,
    onDragStart,
    onDragOver,
    onDragLeave,
    onDrop,
    onDragEnd,
  };
}
