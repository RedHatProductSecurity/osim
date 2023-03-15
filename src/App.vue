<script setup lang="ts">
import {RouterView} from 'vue-router'
import * as bootstrap from 'bootstrap/dist/js/bootstrap.min.js'
import Navbar from './components/Navbar.vue'
</script>

<template>
  <header>
    <Navbar v-if="!$route.meta.hideNavbar"/>
  </header>
  <RouterView/>
</template>

<style scoped>

</style>
