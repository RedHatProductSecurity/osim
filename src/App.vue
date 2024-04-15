<script setup lang="ts">

import { DateTime } from 'luxon';
import { RouterView } from 'vue-router';
import Navbar from './components/Navbar.vue';
import {
  setup,
  osidbHealth,
  osimRuntime,
  osimRuntimeStatus,
  OsimRuntimeStatus,
} from '@/stores/osimRuntime';

import { onBeforeUnmount, onMounted, ref, watch, watchEffect } from 'vue';
import ToastContainer from '@/components/ToastContainer.vue';
import ChangeLog from '@/components/ChangeLog.vue';
import { useElementBounding } from '@vueuse/core';
import { footerHeight, footerTop } from '@/stores/responsive';

setup();

watch(osimRuntimeStatus, () => {
  if (osimRuntimeStatus.value === OsimRuntimeStatus.READY) {
    updateRelativeOsimBuildDate();
  }
});

const elFooter = ref<HTMLElement | null>(null);
const { top: footerTop_, height: footerHeight_ } = useElementBounding(elFooter);
watchEffect(() => {
  footerTop.value = footerTop_.value;
  footerHeight.value = footerHeight_.value;
});
const relativeOsimBuildDate = ref('');
const updateRelativeOsimBuildDate = () => {
  relativeOsimBuildDate.value =
    DateTime.fromISO(osimRuntime.value.osimVersion.timestamp).toRelative() || '';
};
let buildDateIntervalId: number = -1;
onMounted(() => {
  const ms15Minutes = 15 * 60 * 60 * 1000;
  buildDateIntervalId = setInterval(updateRelativeOsimBuildDate, ms15Minutes);
  updateRelativeOsimBuildDate();
});
onBeforeUnmount(() => {
  clearInterval(buildDateIntervalId);
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
      <!--TODO add active request count-->
      <!--<div>[ Requests: {{ activeRequestCount }} ]</div>-->
      <ChangeLog />
      <div>
        [
        OSIM
        | env: {{ osimRuntime.env }}
        | <span :title="osimRuntime.osimVersion.rev">
          tag: {{ osimRuntime.osimVersion.tag }}
          <span v-if="osimRuntime.osimVersion.dirty">(dirty)</span>
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
  /* position: fixed; */
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
