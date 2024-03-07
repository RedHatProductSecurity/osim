<script setup lang="ts">
import {RouterView} from 'vue-router';
import Navbar from './components/Navbar.vue';
import {osidbHealth, osimRuntime, osimRuntimeStatus, OsimRuntimeStatus} from '@/stores/osimRuntime';


import {setup} from '@/stores/osimRuntime';
import {ref, watchEffect} from 'vue';
import ToastContainer from '@/components/ToastContainer.vue';
import {useElementBounding} from '@vueuse/core';
import {footerHeight, footerTop} from '@/stores/responsive';
setup();

const elFooter = ref<HTMLElement | null>(null);
const {top: footerTop_, height: footerHeight_} = useElementBounding(elFooter);
watchEffect(() => {
  footerTop.value = footerTop_.value;
  footerHeight.value = footerHeight_.value;
});

</script>

<template>
  <template v-if="osimRuntimeStatus === OsimRuntimeStatus.READY">
    <header>
      <Navbar v-if="!$route.meta.hideNavbar" />
    </header>
    <div class="osim-content-layered">
      <ToastContainer />
      <RouterView class="osim-page-view" />
    </div>
    <footer ref="elFooter" class="fixed-bottom osim-status-bar">
      <div>OSIDB</div>
      <div class="osim-status-osidb-env">[env: {{ osidbHealth.env }}]</div>
      <div class="osim-status-osidb-ver">[ver: {{ osidbHealth.version }}]</div>
      <div class="osim-status-osidb-rev">[rev: {{ osidbHealth.revision }}]</div>
      <div
        v-if="osimRuntime.error"
        class="osim-status-osidb-err"
      >[err: {{ osimRuntime.error }}]</div>
    </footer>
  </template>
  <div v-else-if="osimRuntimeStatus === OsimRuntimeStatus.ERROR" class="osim-backend-error">
    {{ osimRuntime.error }}
  </div>
</template>

<style>

:root {
  --osim-status-bar-height: 24px;
}
/*
.osim-view-wrapper {
  position: relative;
  display: grid;
}
.osim-view-wrapper > * {
  grid-column-start: 1;
  grid-row-start: 1;
  align-items: start;
}
*/

.osim-content-layered {
  display: grid;
  margin-bottom: var(--osim-status-bar-height);
}
.osim-content-layered > * {
  grid-column-start: 1;
  grid-row-start: 1;
  align-items: start;
}

.osim-backend-error {
  max-width: 60em;
  border: 1px solid darkred;
  padding: 1em;
  margin: 1em;
  display: flex;
  justify-content: center;
  align-self: center;
}

.osim-page-view {
  margin-bottom: var(--osim-status-bar-height);
}

.osim-status-bar.fixed-bottom {
  /*position: fixed;*/
  background: #efefef;
  border-top: 1px solid #ddd;
  height: var(--osim-status-bar-height);
  display: flex;
  justify-content: flex-end;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 1091; /* --bs-toast-zindex + 1 */
}

.osim-status-bar > * {
  border-left: 1px solid #ddd;
  padding: 0 3px;
}

</style>
