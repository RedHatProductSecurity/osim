import { ref, computed, onMounted, onUnmounted, type Ref } from 'vue';

interface UseTableResizeOptions {
  maxColumnWidth?: number;
  maxTableWidth?: number;
  minColumnWidth?: number;
}

export function useTableResize(
  initialcolumnWidths: number[],
  headerRowRef: Ref<HTMLTableRowElement | null>,
  options?: UseTableResizeOptions,
) {
  const columnWidths = ref<number[]>(initialcolumnWidths);
  const MIN_COLUMN_WIDTH = options?.minColumnWidth ?? 50;
  const MAX_COLUMN_WIDTH = options?.maxColumnWidth ?? 500;
  const MAX_TABLE_WIDTH = options?.maxTableWidth ?? 1800;

  const resizingColIndex = ref<null | number>(null);
  const initialMouseX = ref<number>(0);
  const initialColWidth = ref<number>(0);
  const nextColInitialWidth = ref<number>(0);

  const totalColumnWidth = computed(() => {
    return Object.values(columnWidths.value).reduce((sum, width) => sum + width, 0);
  });

  const startResize = (event: MouseEvent, index: number) => {
    resizingColIndex.value = index;
    initialMouseX.value = event.clientX;
    initialColWidth.value = (event.target as HTMLElement).parentElement!.offsetWidth;

    if (index + 1 < columnWidths.value.length && columnWidths.value[index + 1] !== undefined) {
      nextColInitialWidth.value = columnWidths.value[index + 1];
    } else {
      nextColInitialWidth.value = 0;
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', endResize);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const onMouseMove = (event: MouseEvent) => {
    if (resizingColIndex.value === null) return;

    const dx = event.clientX - initialMouseX.value;

    let newCurrentColWidth = Math.max(
      MIN_COLUMN_WIDTH,
      Math.min(MAX_COLUMN_WIDTH, initialColWidth.value + dx),
    );

    const currentTotalExcludingResizing = totalColumnWidth.value - columnWidths.value[resizingColIndex.value];
    const potentialTotalWidth = currentTotalExcludingResizing + newCurrentColWidth;

    if (potentialTotalWidth >= MAX_TABLE_WIDTH) {
      newCurrentColWidth = MAX_TABLE_WIDTH - currentTotalExcludingResizing;
      newCurrentColWidth = Math.max(MIN_COLUMN_WIDTH, Math.min(MAX_COLUMN_WIDTH, newCurrentColWidth));
    }
    columnWidths.value[resizingColIndex.value] = newCurrentColWidth;
  };

  const endResize = () => {
    resizingColIndex.value = null;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', endResize);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  };

  const updateColumnWidths = () => {
    if (headerRowRef.value) {
      const thElements = headerRowRef.value.querySelectorAll('th');

      thElements.forEach((th: HTMLElement, index) => {
        columnWidths.value[index] = th.offsetWidth ?? MIN_COLUMN_WIDTH;
      });
    }
  };

  onMounted(() => {
    updateColumnWidths();
  });

  onUnmounted(() => {
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', endResize);
  });

  return {
    startResize,
    columnWidths,
  };
}
