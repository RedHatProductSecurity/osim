/// <reference types="vite/client" />

import type { OsimRuntime } from '@/stores/osimRuntime';

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    vOsimLoading?: typeof import('./src/directives/LoadingAnimationDirective').LoadingAnimationDirective;
  }
}

declare global {
  interface Window {
    __osim_runtime?: OsimRuntime;
  }
}

export {};
