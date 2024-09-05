import { createApp } from 'vue';
import type { Directive } from 'vue';

import { createPinia } from 'pinia';
import { IMaskDirective } from 'vue-imask';

import { InputLabelDirective } from '@/directives/InputLabelDirective.js';
import { LoadingAnimationDirective } from '@/directives/LoadingAnimationDirective.js';

import App from './App.vue';
import router from './router';

import './scss/index.scss';
import './assets/main.css';
import 'bootstrap';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);
app.directive('input-label', InputLabelDirective);
app.directive('osim-loading', LoadingAnimationDirective);
app.directive('imask', IMaskDirective as Directive);

app.mount('#app');
