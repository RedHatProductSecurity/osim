import type { Directive, DirectiveBinding } from 'vue';

const definedArgs: Record<string, string> = {
  grow: 'spinner-grow',
  border: 'spinner-border',
};

const defaultClass = 'border';
const cssClass = (arg: string) => definedArgs[arg] || definedArgs[defaultClass];

const loaders = new Map<HTMLElement, HTMLDivElement>();

function createLoaderElement(element: HTMLElement) {
  const spinner = document.createElement('div');
  spinner.style.maxHeight = '1rem';
  spinner.style.maxWidth = '1rem';
  loaders.set(element, spinner);
  spinner.setAttribute('role', 'status');
  element.prepend(spinner);
}

function updateLoaderElement(el: HTMLElement, binding: DirectiveBinding) {
  const loader = loaders.get(el);
  if (!loader) {
    return;
  }
  const isLoading = binding.value;
  const [spinnerStyle] = Object.entries(binding.modifiers).find(
    ({ 1: isChosen }) => isChosen,
  ) || [defaultClass];
  const spinnerClass = cssClass(spinnerStyle);
  if (isLoading) {
    loader.classList.add(spinnerClass);
  } else {
    loader.classList.remove(spinnerClass);
  }
}

export const LoadingAnimationDirective: Directive = {
  mounted: (el, binding) => {
    createLoaderElement(el);
    updateLoaderElement(el, binding);
  },
  updated: (el, binding) => {
    updateLoaderElement(el, binding);
  },
  unmounted: (el) => {
    const loader = loaders.get(el);
    if (loader) {
      el.removeChild(loader);
    }
  },
};
