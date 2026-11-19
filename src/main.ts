import { createApp } from 'vue';
import type { Directive } from 'vue';

import { createPinia } from 'pinia';
import { IMaskDirective } from 'vue-imask';

import { LoadingAnimationDirective } from '@/directives/LoadingAnimationDirective.js';
import resize from '@/directives/resizableTableColumns.js';

import App from './App.vue';
import router from './router';
import { checkBackendHealth, osimRuntime, parseRuntime } from './stores/osimRuntime';
import { recordVueError } from './services/telemetryRecorder';

import './scss/index.scss';
import './assets/main.css';
import 'bootstrap';
// Import vue-data-ui CSS after Bootstrap to ensure its styles take precedence
import 'vue-data-ui/style.css';

const app = createApp(App);
const pinia = createPinia();
app.use(pinia);
app.config.errorHandler = (error, instance) => {
  console.error('Vue application error', error);
  recordVueError(error, instance?.$options.name);
};
app.directive('osim-loading', LoadingAnimationDirective);
app.directive('imask', IMaskDirective as Directive);
app.directive('resizableTableColumns', resize as Directive);

parseRuntime();
void (async () => {
  if (osimRuntime.value.telemetry?.otlpEndpoint) {
    const load = import('@/services/telemetry').then(({ initializeTelemetry }) => {
      initializeTelemetry(osimRuntime.value);
    }).catch(() => {}); // Tracing is optional, even if the SDK loads after startup.
    let timer: ReturnType<typeof setTimeout> | undefined;
    await Promise.race([
      load,
      new Promise<void>((resolve) => { timer = setTimeout(resolve, 200); }),
    ]);
    clearTimeout(timer);
  }
  // The exporter sends asynchronously; instrumentation must be installed before app requests start.
  app.use(router);
  app.mount('#app');
  await checkBackendHealth();
})().catch(error => console.error('OSIM startup failed', error));
