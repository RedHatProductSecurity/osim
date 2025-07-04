import { createApp } from 'vue';
import type { Directive } from 'vue';

import { createPinia } from 'pinia';
import { IMaskDirective } from 'vue-imask';

import { LoadingAnimationDirective } from '@/directives/LoadingAnimationDirective.js';

import App from './App.vue';
import router from './router';
import { configureBackends } from './stores/osimRuntime';

import './scss/index.scss';
import './assets/main.css';
import 'bootstrap';

configureBackends();

const app = createApp(App);
const pinia = createPinia();
app.use(pinia);
app.use(router);
app.directive('osim-loading', LoadingAnimationDirective);
app.directive('imask', IMaskDirective as Directive);

app.mount('#app');
