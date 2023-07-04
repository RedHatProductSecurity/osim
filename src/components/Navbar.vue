<script setup lang="ts">
import RedHatLogoSvg from '../assets/Logo-Red_Hat-B-Standard-RGB.svg'
// import RedHatLogo from '@/components/icons/RedHatLogo.vue';
import {RouterLink} from 'vue-router'
import {useUserStore} from '@/stores/UserStore';
import {ref} from 'vue';
import router from '@/router';

const userStore = useUserStore();

const searchIssue = ref("");

function onSearch(query: string) {
  let trimmedQuery = query.trim();
  if (trimmedQuery === '') {
    return;
  }
  router.push({name: 'search', query: {query: trimmedQuery}});
}
</script>

<template>
  <nav class="navbar navbar-expand navbar-dark bg-dark">
    <div class="container">
      <RouterLink to="/" class="navbar-brand osim-home-link">
        <!--<RedHatLogo class="osim-logo"/>-->
        <img :src="RedHatLogoSvg"
             alt="Red Hat Logo"
             class="d-inline-block align-text-top me-auto osim-logo"
             height="64"
        />
        <div class="ms-auto"><abbr title="Open Security Issue Management">OSIM</abbr></div>
      </RouterLink>

      <ul class="navbar-nav me-auto mb-2 mb-lg-0">
        <li class="nav-item">
          <RouterLink class="nav-link" :to="{name: 'index'}">Index</RouterLink>
        </li>
        <!--<li class="nav-item">-->
        <!--  <RouterLink class="nav-link" to="/tracker">Tracker</RouterLink>-->
        <!--</li>-->
        <!--<li class="nav-item">-->
        <!--  <RouterLink class="nav-link" to="/flaw-details">Flaw Details</RouterLink>-->
        <!--</li>-->
      </ul>
      <div class="osim-search me-2">
        <form role="search" @submit.prevent="onSearch(searchIssue)">

              <div class="input-group">
                <input
                    v-model="searchIssue"
                    type="search"
                    class="form-control"
                    placeholder="Search Issues/Flaws"
                    aria-label="Search Issues/Flaws"

                />
                <button class="btn btn-secondary" type="button"><i class="bi-search"></i></button>
              </div>

          <!--<input class="form-control" type="search" placeholder="Search Issues/Flaws" aria-label="Search Issues/Flaws" v-model="searchIssue"/>-->
        </form>
      </div>
      <div class="btn-group">
        <button type="button" class="btn btn-secondary dropdown-toggle osim-user-profile" data-bs-toggle="dropdown"
                aria-expanded="false">
          {{ userStore.userName }}
          <i class="bi-person-circle osim-user-profile-picture"></i>
        </button>
        <ul class="dropdown-menu dropdown-menu-end">
          <li>
            <button class="dropdown-item" type="button" @click.prevent="userStore.logout">Logout</button>
          </li>
        </ul>
      </div>

    </div>
  </nav>
</template>

<style>

.navbar {
  /*height: 64px;*/
}

.osim-home-link {
  /*height: 64px;*/
  /*height: 100%;*/
}

.osim-logo {
  /*height: 100%;*/
  max-height: 100%;
  background: white;
  padding: 5px;
  border-radius: 5px;
}

.osim-logo-text {
  display: inline-block;
}

.osim-user-profile .osim-user-profile-picture {
  /*font-size: 2rem;*/
}

.osim-logo-container {
  height: 64px;
}
</style>
