
import type { Directive } from 'vue';

const idPrefix = 'osim-';
let idCounter = 1000;

export const InputLabelDirective: Directive = {
  created: (el, binding) => {
    let id = el.getAttribute('id');
    if (id == null) {
      idCounter += 1;
      id = idPrefix + binding.arg + '-' + idCounter.toString(16);
      el.setAttribute('id', id);
    }
    if (binding.value != null) {
      binding.value[<string>binding.arg] = id;
    }
  },
  unmounted: (el, binding) => {
    if (binding.value != null) {
      delete binding.value[<string>binding.arg];
    }
  },
};
