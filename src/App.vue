<script setup lang="ts">
import {RouterView} from 'vue-router'
import Navbar from './components/Navbar.vue'
import {osimRuntime, osimRuntimeStatus, OsimRuntimeStatus} from '@/stores/osimRuntime';


import {setup} from '@/stores/osimRuntime';
setup();

</script>

<template>
  <template v-if="osimRuntimeStatus === OsimRuntimeStatus.READY">
    <header>
      <Navbar v-if="!$route.meta.hideNavbar"/>
    </header>
    <RouterView/>
  </template>
  <div v-else-if="osimRuntimeStatus === OsimRuntimeStatus.ERROR" class="osim-backend-error">
    {{ osimRuntime.error }}
  </div>
</template>

<style scoped>

.osim-backend-error {
  max-width: 60em;
  border: 1px solid darkred;
  padding: 1em;
  margin: 1em;
  display: flex;
  justify-content: center;
  align-self: center;
}

</style>
