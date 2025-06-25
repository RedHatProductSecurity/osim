/// <reference types="vite/client" />

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    vOsimLoading?: typeof import('./src/directives/LoadingAnimationDirective').LoadingAnimationDirective;
  }
}

export {};
