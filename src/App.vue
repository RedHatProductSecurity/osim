<script setup lang="ts">
import {RouterView} from 'vue-router'
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
