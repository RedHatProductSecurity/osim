import {createApp, watch} from 'vue';
import type {Directive} from 'vue';
import {createPinia} from 'pinia';
import {vMaska} from 'maska';
import {IMaskDirective} from 'vue-imask';

import App from './App.vue'
import router from './router'
import './services/service-worker-client';

import 'bootstrap/scss/bootstrap.scss'
import 'bootstrap-icons/font/bootstrap-icons.scss'

import './assets/main.css'

import 'bootstrap/js/index.esm.js'
import {InputLabelDirective} from '@/directives/InputLabelDirective.js';

const app = createApp(App)
const pinia = createPinia();

app.use(pinia)
app.use(router)
app.directive('input-label', InputLabelDirective);
app.directive('maska', vMaska);
app.directive('imask', IMaskDirective as Directive);


app.mount('#app')
