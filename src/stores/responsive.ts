// Track header and footer for elements between to have responsive positioning

import {ref} from 'vue';

const navbarHeight = ref<number>(0);
const navbarBottom = ref<number>(0);

const footerTop = ref<number>(0);
const footerHeight = ref<number>(0);

export {
  navbarHeight,
  navbarBottom,
  footerTop,
  footerHeight,
};
