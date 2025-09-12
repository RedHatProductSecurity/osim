<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch, watchEffect } from 'vue';

import { DateTime } from 'luxon';
import { useElementBounding } from '@vueuse/core';

import ToastContainer from '@/components/ToastContainer/ToastContainer.vue';
import ChangeLog from '@/components/ChangeLog/ChangeLog.vue';
import Navbar from '@/components/Navbar/Navbar.vue';
import SessionWarningBanner from '@/components/SessionWarningBanner/SessionWarningBanner.vue';

import {
  osidbHealth,
  osimRuntime,
  osimRuntimeStatus,
} from '@/stores/osimRuntime';
import { footerHeight, footerTop } from '@/stores/responsive';
import { OsimRuntimeStatus } from '@/types/zodOsim';
import { updateCWEData } from '@/services/CweService';
import { useSettingsStore } from '@/stores/SettingsStore';

watch(osimRuntimeStatus, async () => {
  if (osimRuntimeStatus.value === OsimRuntimeStatus.READY) {
    updateRelativeOsimBuildDate();
    updateCWEData();

    // Initialize API keys after runtime is ready
    const settingsStore = useSettingsStore();
    await settingsStore.initializeApiKeys();
  }
});

const elFooter = ref<HTMLElement | null>(null);
const { height: footerHeight_, top: footerTop_ } = useElementBounding(elFooter);
watchEffect(() => {
  footerTop.value = footerTop_.value;
  footerHeight.value = footerHeight_.value;
});
const relativeOsimBuildDate = ref('');
const updateRelativeOsimBuildDate = () => {
  relativeOsimBuildDate.value =
    DateTime.fromISO(osimRuntime.value.osimVersion.timestamp).toRelative() || '';
};
let buildDateIntervalId: ReturnType<typeof setInterval>;
onMounted(() => {
  const ms15Minutes = 15 * 60 * 60 * 1000;
  buildDateIntervalId = setInterval(updateRelativeOsimBuildDate, ms15Minutes);
  updateRelativeOsimBuildDate();
  const favicon: HTMLLinkElement | null = document.querySelector('head link[rel=\'icon\']');
  if (!favicon) return;
  if (location.origin.includes('/localhost')) {
    favicon.href = '/favicon-local.png';
  } else if (location.origin.includes('/osim-stage.')) {
    favicon.href = '/favicon-stage.png';
  } else if (location.origin.includes('/osim-uat.')) {
    favicon.href = '/favicon-uat.png';
  }
});

onBeforeUnmount(() => {
  clearInterval(buildDateIntervalId);
});
</script>

<template>
  <template v-if="osimRuntimeStatus === OsimRuntimeStatus.READY">
    <SessionWarningBanner />
    <header>
      <Navbar v-if="!$route.meta.hideNavbar" />
    </header>
    <div class="osim-content-layered">
      <ToastContainer />
      <RouterView v-slot="{ Component }" class="container-fluid osim-page-view">
        <KeepAlive include="IndexView">
          <component :is="Component" />
        </KeepAlive>
      </RouterView>
    </div>
    <footer ref="elFooter" class="fixed-bottom osim-status-bar">
      <!--TODO add active request count-->
      <!--<div>[ Requests: {{ activeRequestCount }} ]</div>-->
      <ChangeLog />
      <div>
        [
        OSIM
        | env: {{ osimRuntime.env }}
        | <span :title="osimRuntime.osimVersion.rev">
          tag: {{ osimRuntime.osimVersion.tag }}
        </span>
        | ts : {{ osimRuntime.osimVersion.timestamp
          .substring(0, osimRuntime.osimVersion.timestamp.indexOf('T')) }}
        ({{ relativeOsimBuildDate }})
        ]
      </div>
      <div>
        [
        OSIDB
        | env: {{ osidbHealth.env }}
        | <span :title="osidbHealth.revision.substring(0, 7)">ver: {{ osidbHealth.version }}</span>
        ]
      </div>
      <div v-if="osimRuntime.error" class="osim-status-osidb-err">
        [err: {{ osimRuntime.error }}]
      </div>
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

.osim-content-layered {
  margin-bottom: var(--osim-status-bar-height);

  .container-fluid {
    --bs-gutter-x: 6rem;
  }
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

.osim-status-bar.fixed-bottom {
  background: #efefef;
  border-top: 1px solid #ddd;
  height: var(--osim-status-bar-height);
  display: flex;
  justify-content: flex-end;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 1091;
}

.osim-status-bar > * {
  border-left: 1px solid #ddd;
  padding: 0 3px;
}
</style>
