<script setup lang="ts">
import RedHatIconSvg from '../assets/Logo-Red_Hat-Hat_icon-Standard-RGB.svg';
// import RedHatLogo from '@/components/icons/RedHatLogo.vue';
import { RouterLink } from 'vue-router';
import { useUserStore } from '@/stores/UserStore';
import { computed, ref, watchEffect } from 'vue';
import router from '@/router';
import { useSettingsStore } from '@/stores/SettingsStore';
import { useToastStore } from '@/stores/ToastStore';
import { useElementBounding } from '@vueuse/core';
import { navbarBottom, navbarHeight } from '@/stores/responsive';
import { osimRuntime } from '@/stores/osimRuntime';
import { cveRegex } from '@/utils/helpers';
import { useSearchParams } from '@/composables/useSearchParams';

const userStore = useUserStore();
const { settings } = useSettingsStore();
const { toasts } = useToastStore();
const elHeader = ref<HTMLElement | null>(null);
const { submitQuickSearch } = useSearchParams();
// const {height: headerHeight} = useElementSize(
//   elHeader, {width: 0, height: 0},
//   {box: 'border-box'}
// );
const { height: headerHeight, bottom: headerBottom } = useElementBounding(elHeader);
watchEffect(() => {
  navbarHeight.value = headerHeight.value;
  navbarBottom.value = headerBottom.value;
});


function quickMatchCVE(query: string) {
  // Match `CVE-`, 4 digits, a hyphen, then 4-7 digits,
  // with optional surrounding whitespace.
  // match[1] will be the CVE ID if it exists
  const trimmedQuery = query.trim();
  return trimmedQuery.match(cveRegex)?.[0];
}

const searchIssue = ref('');

function onSearch(query: string) {
  const trimmedQuery = query.trim();
  if (trimmedQuery === '') {
    return;
  }
  const maybeCveId = quickMatchCVE(query);
  if (maybeCveId) {
    router.push({ path: `/flaws/${maybeCveId}` });
    return;
  }
  submitQuickSearch(trimmedQuery);
}

const usernameDisplay = computed(() => {
  let username = userStore.userName;
  if (userStore.jiraUsername !== '' && userStore.jiraUsername !== username) {
    username += ` | ${userStore.jiraUsername}`;
  }
  return username;
});

</script>

<template>
  <nav ref="elHeader" class="osim-navbar navbar navbar-expand navbar-dark">
    <div class="container-fluid">
      <RouterLink to="/" class="osim-home-link">
        <!--<RedHatLogo class="osim-logo"/>-->
        <img :src="RedHatIconSvg" alt="Red Hat Logo" class="osim-logo" />
      </RouterLink>
      <RouterLink to="/" class="osim-home-text">
        <abbr title="Open Security Issue Management">OSIM</abbr>
        <span v-if="osimRuntime.readOnly" class="rounded-pill badge bg-danger ms-2">Read Only Mode</span>
      </RouterLink>
      <!-- <div class="osim-env">
        <span class="badge bg-secondary osim-env-label">[ {{ userStore.env.toUpperCase() }} ]</span>
      </div> -->
      <ul class="navbar-nav me-auto align-items-center">
        <li class="nav-item">
          <RouterLink class="nav-link" :to="{ name: 'index' }">Index</RouterLink>
        </li>
        <li class="nav-item">
          <RouterLink class="nav-link" :to="{ name: 'flaw-create' }">Create Flaw</RouterLink>
        </li>
        <!--<li class="nav-item">-->
        <!--  <RouterLink class="nav-link" to="/tracker">Tracker</RouterLink>-->
        <!--</li>-->
        <!--<li class="nav-item">-->
        <!--  <RouterLink class="nav-link" to="/flaw-details">Flaw Details</RouterLink>-->
        <!--</li>-->
      </ul>

      <button
        type="button"
        class="osim-notification-button position-relative me-3"
        @click.prevent="settings.showNotifications = !settings.showNotifications"
      >
        <i
          class="bi notification-icon text-white osim-notification-icon"
          :class="{
            'bi-bell-fill': settings.showNotifications,
            'bi-bell-slash-fill': !settings.showNotifications,
          }"
        >
          <span class="visually-hidden">Toggle Notifications</span>
        </i>
        <span
          v-show="toasts.length > 0"
          class="position-absolute start-100
          translate-middle badge bg-danger osim-notification-count"
        >{{ toasts.length > 99 ? '99+' : toasts.length }}</span>
      </button>

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
            <button class="btn btn-secondary" type="submit" @submit.prevent="onSearch(searchIssue)">
              <i class="bi-search">
                <span class="visually-hidden">Search</span>
              </i>
            </button>
            <button
              class="btn btn-secondary dropdown-toggle"
              type="button"
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
            </button>
            <ul class="osim-dropdown-menu dropdown-menu dropdown-menu-end">
              <li>
                <RouterLink
                  class="dropdown-item"
                  :to="{ name: 'search' }"
                >
                  Advanced Search
                </RouterLink>
              </li>
            </ul>
          </div>
        </form>
      </div>
      <div class="btn-group">
        <button
          type="button"
          class="btn btn-secondary dropdown-toggle osim-user-profile"
          data-bs-toggle="dropdown"
          aria-expanded="false"
        >
          {{ usernameDisplay }}
          <i class="bi-person-circle osim-user-profile-picture"></i>
        </button>
        <ul class="osim-dropdown-menu dropdown-menu dropdown-menu-end">
          <li>
            <RouterLink class="dropdown-item" :to="{ name: 'settings' }">Settings</RouterLink>
          </li>
          <li v-if="osimRuntime.env === 'dev'">
            <RouterLink class="dropdown-item" :to="{ name: 'widget-test' }">Widget Test</RouterLink>
          </li>
          <li>
            <hr class="dropdown-divider">
          </li>
          <li>
            <button class="dropdown-item" type="button" @click.prevent="userStore.logout">
              Logout
            </button>
          </li>
        </ul>
      </div>

    </div>
  </nav>
</template>

<style>
.osim-dropdown-menu.dropdown-menu {
  z-index: 1091;

  /* --bs-toast-zindex + 1 */

  /* color: red; */

  /* outline: 1px solid deeppink !important; */
}


.osim-navbar {
  background: black;
}

.osim-home-link {
  flex-shrink: 0;

  /* margin-right: 5px; */
}

/* background: white; */

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
      rgb(255 255 255 / 100%) var(--vertical-padding),
      rgb(255 255 255 / 100%) calc(100% - var(--vertical-padding)),
      transparent calc(100% - var(--vertical-padding))) 1;
}

.osim-home-text {
  padding-left: 9px;
  color: white;
  text-decoration: none;
  margin-right: 9px;
}

.osim-env {
  /* background-color: gray; */
  align-self: stretch;
  display: flex;
  align-items: center;
}

.osim-env>.osim-env-label {
  min-height: 50%;
  display: flex;
  align-items: center;
}

.osim-user-profile .osim-user-profile-picture {
  /* font-size: 2rem; */
}

.osim-logo-container {
  height: 64px;
}

.notification-icon{
  pointer-events: all !important;
  cursor: pointer;
}

.osim-notification-button {
  background: transparent;
  border-color: transparent;
}

.osim-notification-button .osim-notification-count {
  padding: 0.3em;
}
</style>
