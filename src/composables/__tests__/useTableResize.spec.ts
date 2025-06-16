import { ref, type Ref } from 'vue';

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';

import { useTableResize } from '@/composables/useTableResize';

import { createMouseEvent } from '@/__tests__/helpers';

interface UseTableResizeReturn {
  columnWidths: number[];
  endResize: () => void;
  initialColWidth: number;
  initialMouseX: number;
  nextColInitialWidth: number;
  resizingColIndex: null | number;
  startResize: (event: MouseEvent, index: number) => void;
  totalColumnWidth: number;
}

interface TestComponentVm extends UseTableResizeReturn {
  headerRowRef: Ref<HTMLTableRowElement | null>;
}

const defaultOptions = {
  minColumnWidth: 50,
  maxColumnWidth: 450,
  maxTableWidth: 800,
};

const createTestComponent = (
  initialComposableWidths: number[] = [],
) => {
  return mount({
    template: `<div><table><thead><tr ref="headerRowRef"></tr></thead></table></div>`,
    setup() {
      const headerRowRef = ref<HTMLTableRowElement | null>(null);

      const composable = useTableResize(
        initialComposableWidths,
        headerRowRef,
        defaultOptions,
      );
      return { ...composable };
    },
  });
};

describe('useTableResize', () => {
  beforeEach(() => {
    Object.defineProperty(document.body.style, 'cursor', { writable: true, value: '' });
    Object.defineProperty(document.body.style, 'userSelect', { writable: true, value: '' });

    vi.spyOn(document, 'addEventListener');
    vi.spyOn(document, 'removeEventListener');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize column widths from HTML on mount if initial array is empty', async () => {
    const htmlThWidths = [120, 250, 80];
    const wrapper = createTestComponent(htmlThWidths);

    await wrapper.vm.$nextTick();

    const vm = wrapper.vm as unknown as TestComponentVm;

    expect(vm.columnWidths).toEqual(htmlThWidths);
    expect((vm.columnWidths as number[]).reduce((a, b) => a + b, 0)).toBe(450);
  });

  it('should calculate totalColumnWidth correctly', async () => {
    const htmlThWidths = [100, 200, 50];
    const wrapper = createTestComponent(htmlThWidths);
    await wrapper.vm.$nextTick();

    const vm = wrapper.vm as unknown as TestComponentVm;
    expect(vm.totalColumnWidth).toBe(350);
  });

  it('startResize should add event listeners', async () => {
    const htmlThWidths = [100, 200, 150];
    const wrapper = createTestComponent(htmlThWidths);
    await wrapper.vm.$nextTick();

    const vm = wrapper.vm as unknown as TestComponentVm;

    const mockEvent = createMouseEvent('mousedown', 0);
    vm.startResize(mockEvent, 0);
    expect(document.addEventListener).toHaveBeenCalledWith('mousemove', expect.any(Function));
    expect(document.addEventListener).toHaveBeenCalledWith('mouseup', expect.any(Function));
    expect(document.body.style.cursor).toBe('col-resize');
  });

  it('onMouseMove should resize column within min/max bounds', async () => {
    const htmlThWidths = [100, 200, 150];
    const wrapper = createTestComponent(htmlThWidths);
    await wrapper.vm.$nextTick();

    const vm = wrapper.vm as unknown as TestComponentVm;

    vm.startResize(createMouseEvent('mousedown', 100), 0);

    const mouseMoveEvent1 = createMouseEvent('mousemove', 150);
    document.dispatchEvent(mouseMoveEvent1);
    expect((vm.columnWidths as number[])[0]).toBe(150);

    vm.startResize(createMouseEvent('mousedown', 150), 0);
    const mouseMoveEvent2 = createMouseEvent('mousemove', 50);
    document.dispatchEvent(mouseMoveEvent2);
    expect((vm.columnWidths as number[])[0]).toBe(defaultOptions.minColumnWidth);

    vm.startResize(createMouseEvent('mousedown', 50), 0);
    const mouseMoveEvent3 = createMouseEvent('mousemove', 600);
    document.dispatchEvent(mouseMoveEvent3);
    expect((vm.columnWidths as number[])[0]).toBe(defaultOptions.maxColumnWidth);
  });

  it('onMouseMove should cap total table width at MAX_TABLE_WIDTH', async () => {
    const htmlThWidths = [400, 300, 50];
    const wrapper = createTestComponent(htmlThWidths);
    await wrapper.vm.$nextTick();

    const vm = wrapper.vm as unknown as TestComponentVm;

    vm.startResize(createMouseEvent('mousedown', 0), 0);

    document.dispatchEvent(createMouseEvent('mousemove', 50));
    expect(vm.columnWidths[0]).toBe(450);

    expect(vm.totalColumnWidth).toBe(800);

    vm.startResize(createMouseEvent('mousedown', 50), 0);
    document.dispatchEvent(createMouseEvent('mousemove', 51));
    expect(vm.columnWidths[0]).toBe(450);
    expect(vm.totalColumnWidth).toBe(800);
  });

  it('endResize should reset states and remove event listeners', async () => {
    const htmlThWidths = [100, 200, 150];
    const wrapper = createTestComponent(htmlThWidths);
    await wrapper.vm.$nextTick();

    const vm = wrapper.vm as unknown as TestComponentVm;

    vm.startResize(createMouseEvent('mousedown', 0), 0);
    expect(document.addEventListener).toHaveBeenCalledWith('mousemove', expect.any(Function));
    expect(document.addEventListener).toHaveBeenCalledWith('mouseup', expect.any(Function));

    vm.endResize();

    expect(vm.resizingColIndex).toBeNull();
    expect(document.removeEventListener).toHaveBeenCalledWith('mousemove', expect.any(Function));
    expect(document.removeEventListener).toHaveBeenCalledWith('mouseup', expect.any(Function));
    expect(document.body.style.cursor).toBe('');
    expect(document.body.style.userSelect).toBe('');
  });

  it('onUnmounted should remove event listeners', async () => {
    const wrapper = createTestComponent([100]);
    await wrapper.vm.$nextTick();

    wrapper.unmount();

    expect(document.removeEventListener).toHaveBeenCalledWith('mousemove', expect.any(Function));
    expect(document.removeEventListener).toHaveBeenCalledWith('mouseup', expect.any(Function));
  });
});
