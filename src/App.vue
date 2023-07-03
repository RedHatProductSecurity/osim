<script setup lang="ts">
import {RouterView} from 'vue-router'
import Navbar from './components/Navbar.vue'
import {osidbHealth, osimRuntime, osimRuntimeStatus, OsimRuntimeStatus} from '@/stores/osimRuntime';


import {setup} from '@/stores/osimRuntime';
import {ref} from 'vue';
setup();

let statusBarHeight = ref(24);

</script>

<template>
  <template v-if="osimRuntimeStatus === OsimRuntimeStatus.READY">
    <header>
      <Navbar v-if="!$route.meta.hideNavbar"/>
    </header>
    <RouterView class="osim-page-view" />
    <footer class="fixed-bottom osim-status-bar">
      <div>OSIDB</div>
      <div class="osim-status-osidb-env">[env: {{osidbHealth.env}}]</div>
      <div class="osim-status-osidb-ver">[ver: {{osidbHealth.version}}]</div>
      <div class="osim-status-osidb-rev">[rev: {{osidbHealth.revision}}]</div>
      <div class="osim-status-osidb-err" v-if="osimRuntime.error">[err: {{osimRuntime.error}}]</div>
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

.osim-status-bar {
  position: fixed;
  background: #efefef;
  border-top: 1px solid #ddd;
  height: var(--osim-status-bar-height);
  display: flex;
  justify-content: flex-end;
}

.osim-status-bar > * {
  border-left: 1px solid #ddd;
  padding: 0 3px;
}

</style>
