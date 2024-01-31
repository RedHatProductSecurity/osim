<script setup lang="ts">
import RedHatLogoSvg from '../assets/Logo-Red_Hat-B-Standard-RGB.svg'
import RedHatIconSvg from '../assets/Logo-Red_Hat-Hat_icon-Standard-RGB.svg'
// import RedHatLogo from '@/components/icons/RedHatLogo.vue';
import {RouterLink} from 'vue-router'
import {useUserStore} from '@/stores/UserStore';
import {ref, watchEffect} from 'vue';
import router from '@/router';
import {useElementBounding} from "@vueuse/core";
import {useSettingsStore} from "../stores/SettingsStore";
import { useToastStore } from '@/stores/ToastStore';
import {navbarBottom, navbarHeight} from '@/stores/responsive';

const userStore = useUserStore();
const settingsStore = useSettingsStore();
const { toasts } = useToastStore();
const elHeader = ref<HTMLElement | null>(null);
// const {height: headerHeight} = useElementSize(elHeader, {width: 0, height: 0}, {box: 'border-box'});
const {height: headerHeight, bottom: headerBottom} = useElementBounding(elHeader);
watchEffect(() => {
  navbarHeight.value = headerHeight.value;
  navbarBottom.value = headerBottom.value;
});

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
  <nav
      class="osim-navbar navbar navbar-expand navbar-dark"
      ref="elHeader"
  >
    <div class="container">
      <RouterLink to="/" class="osim-home-link">
        <!--<RedHatLogo class="osim-logo"/>-->
        <img :src="RedHatIconSvg"
             alt="Red Hat Logo"
             class="osim-logo"
        />
      </RouterLink>
      <RouterLink to="/" class="osim-home-text">
        <abbr title="Open Security Issue Management">OSIM</abbr>
      </RouterLink>
<!--      <div class="osim-env">-->
<!--        <span class="badge bg-secondary osim-env-label">[ {{ userStore.env.toUpperCase() }} ]</span>-->
<!--      </div>-->
      <ul class="navbar-nav me-auto align-items-center">
        <li class="nav-item">
          <RouterLink class="nav-link" :to="{name: 'index'}">Index</RouterLink>
        </li>
        <li class="nav-item">
          <RouterLink class="nav-link" :to="{name: 'flaw-create'}">Create Flaw</RouterLink>
        </li>
        <!--<li class="nav-item">-->
        <!--  <RouterLink class="nav-link" to="/tracker">Tracker</RouterLink>-->
        <!--</li>-->
        <!--<li class="nav-item">-->
        <!--  <RouterLink class="nav-link" to="/flaw-details">Flaw Details</RouterLink>-->
        <!--</li>-->
      </ul>

      <i
        class="bi px-3 fs-4 me-2 position-relative notification-icon"
        :class="{
          'bi-bell-fill text-white': settingsStore.showNotification,
          'bi-bell-slash-fill text-white': !settingsStore.showNotification
        }"
        @click="settingsStore.toggleNotification()"
      >
        <span
          class="position-absolute start-30 translate-middle badge border bg-danger text-white rounded-circle notification-badge"
          v-show="toasts.length > 0"
        >{{ toasts.length }}</span>
      </i>

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
        <ul class="osim-dropdown-menu dropdown-menu dropdown-menu-end">
          <li>
            <RouterLink class="dropdown-item" :to="{name: 'settings'}">Settings</RouterLink>
          </li>
          <li>
            <RouterLink class="dropdown-item" :to="{name: 'widget-test'}">Widget Test</RouterLink>
          </li>
          <li><hr class="dropdown-divider"></li>
          <li>
            <button class="dropdown-item" type="button" @click.prevent="userStore.logout">Logout</button>
          </li>
        </ul>
      </div>

    </div>
  </nav>
</template>

<style>

.osim-dropdown-menu.dropdown-menu {
  z-index: 1091; /* --bs-toast-zindex + 1 */
  /*color: red;*/
  /*outline: 1px solid deeppink !important;*/
}


.osim-navbar {
  background: black;
}

.osim-home-link {
  flex-shrink: 0;
  /*margin-right: 5px;*/
}

/*background: white;*/
/*
filter:
    !*
    drop-shadow(1px  0    0.33px white)
    drop-shadow(-1px 0    0.33px white)
    drop-shadow(0    1px  0.33px white)
    drop-shadow(0    -1px 0.33px white)
    *!
    drop-shadow(2px  0    0.33px white)
    !*
    drop-shadow(2px  1px  0.33px white)
    drop-shadow(2px  -1px 0.33px white)
    *!
    drop-shadow(-2px 0    0.33px white)
    !*
    drop-shadow(-2px 1px  0.33px white)
    drop-shadow(-2px -1px 0.33px white)
    *!
    drop-shadow(0    2px  0.33px white)
    !*
    drop-shadow(1px  2px  0.33px white)
    drop-shadow(-1px 2px  0.33px white)
    *!
    drop-shadow(0    -2px 0.33px white)
    !*
    drop-shadow(1px  -2px 0.33px white)
    drop-shadow(-1px -2px 0.33px white)
    *!
;
*/

.osim-logo {
  height: 40px;
  max-width: 100%;

  --vertical-padding: 5px;
  padding: var(--vertical-padding) 11px var(--vertical-padding) 0;
  border-right: 1px solid white;
  border-image: linear-gradient(to bottom,
    transparent var(--vertical-padding),
    rgba(255,255,255,1) var(--vertical-padding),
    rgba(255,255,255,1) calc(100% - var(--vertical-padding)),
    transparent calc(100% - var(--vertical-padding))) 1;
}

.osim-home-text {
  padding-left: 9px;
  color: white;
  text-decoration: none;
  margin-right: 9px;
}

.osim-env {
  /*background-color: gray;*/
  align-self: stretch;
  display: flex;
  align-items: center;
}

.osim-env > .osim-env-label {
  min-height: 50%;
  display: flex;
  align-items: center;
}

.osim-user-profile .osim-user-profile-picture {
  /*font-size: 2rem;*/
}

.osim-logo-container {
  height: 64px;
}

.notification-icon{
  pointer-events: all !important;
  cursor: pointer;
}

.notification-badge{
  font-size: 0.5rem !important;
  top: 20%;
}
</style>
