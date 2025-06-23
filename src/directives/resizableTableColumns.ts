const resize = {
  mounted: (el: HTMLElement, { value: widths = [] as number[] }) => {
    const columns: HTMLElement[] = [];
    let resizing = false;
    let initialX = 0;
    let activeIdx = 0;

    el.querySelectorAll('th').forEach((th, idx) => {
      th.classList.add('resizable');

      widths[idx] ??= th.offsetWidth;
      th.style.width = `${widths[idx]}px`;

      const resizer = htmlToNode(`<div class="resizer"></div>`);
      resizer?.addEventListener('mousedown', (e) => {
        resizing = true;
        initialX = (e as MouseEvent).clientX;
        activeIdx = idx;
      });

      th.appendChild(resizer!);
      columns.push(th);
    });

    document.addEventListener('mouseup', () => {
      console.log('stop');
      resizing = false;
    });

    document.addEventListener('mousemove', (e) => {
      if (!resizing) return;

      const dx = e.clientX - initialX;
      initialX += dx;
      widths[activeIdx] += dx;
      columns[activeIdx].style.width = `${widths[activeIdx]}px`;
    });
  },
};

function htmlToNode(html: string) {
  const template = document.createElement('template');
  template.innerHTML = html;
  return template.content.firstChild;
}

export default resize;
