const resize = {
  mounted: (el: HTMLElement, { value: widths = [] as number[] }) => {
    const columns: HTMLElement[] = [];
    const resizers: HTMLElement[] = [];
    let resizing = false;
    let initialX = 0;
    let activeIdx = 0;

    const handleMouseUp = () => {
      resizing = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizing) return;

      const dx = e.clientX - initialX;
      initialX += dx;
      widths[activeIdx] += dx;
      columns[activeIdx].style.width = `${widths[activeIdx]}px`;
    };

    const handleMouseDown = (idx: number) => (e: MouseEvent) => {
      resizing = true;
      initialX = e.clientX;
      activeIdx = idx;
    };

    const mouseDownHandlers: ((e: MouseEvent) => void)[] = [];

    el.querySelectorAll('th').forEach((th, idx) => {
      th.classList.add('resizable');

      widths[idx] ??= th.offsetWidth;
      th.style.width = `${widths[idx]}px`;

      const resizer = document.createElement('div');
      resizer.classList.add('resizer');

      const mouseDownHandler = handleMouseDown(idx);
      resizer.addEventListener('mousedown', mouseDownHandler);

      mouseDownHandlers.push(mouseDownHandler);
      resizers.push(resizer);

      th.appendChild(resizer);
      columns.push(th);
    });

    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mousemove', handleMouseMove);

    (el as any)._resizeCleanup = {
      resizers,
      mouseDownHandlers,
      handleMouseUp,
      handleMouseMove,
    };
  },

  unmounted: (el: HTMLElement) => {
    const cleanup = (el as any)._resizeCleanup;
    if (!cleanup) return;

    const { handleMouseMove, handleMouseUp, mouseDownHandlers, resizers } = cleanup;

    resizers.forEach((resizer: HTMLElement, idx: number) => {
      resizer.removeEventListener('mousedown', mouseDownHandlers[idx]);
    });

    document.removeEventListener('mouseup', handleMouseUp);
    document.removeEventListener('mousemove', handleMouseMove);

    delete (el as any)._resizeCleanup;
  },
};

export default resize;
