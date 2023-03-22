<script setup lang="ts">
import RedHatLogo from '../assets/Logo-Red_Hat-B-Standard-RGB.svg'
import {RouterLink} from 'vue-router'
</script>

<template>
  <nav class="navbar">
    <div class="container-fluid">
      <RouterLink to="/" class="navbar-brand">
        <img :src="RedHatLogo" alt="Red Hat Logo" class="osim-logo"/>AAAA
      </RouterLink>
    </div>
    <div class="osim-nav">
      <div>Queue Management</div>
      <div>User Management</div>
    </div>
    <RouterLink to="/">Home</RouterLink>
    <RouterLink to="/login">Login</RouterLink>
    <RouterLink to="/about">About</RouterLink>
    <RouterLink to="/ir-web-ui">IR Web UI</RouterLink>
    <div class="osim-search">
      <label>
        Search Incidents
        <input type="text" placeholder="Search Incidents"/>
      </label>
    </div>
    <div class="osim-user-profile">
      <i class="bi-person osim-user-profile-picture"></i>
    </div>
  </nav>
</template>

<style scoped>

.osim-logo {
  max-height: 100%;
  object-fit: contain;
  height: 100%;
}
</style>
