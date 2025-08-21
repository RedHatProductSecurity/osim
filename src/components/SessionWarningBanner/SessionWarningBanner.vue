<script setup lang="ts">
import { ref, computed, watch } from 'vue';

import { useSessionWarning } from '@/composables/useSessionWarning';

import { useToastStore } from '@/stores/ToastStore';
import { osimRuntime } from '@/stores/osimRuntime';

const {
  isAccessTokenExpiringInOneHour,
  isReauthenticating,
  reauthenticate,
  timeUntilExpiration,
} = useSessionWarning();

const toastStore = useToastStore();
const isDismissed = ref(false);

const authMethod = computed(() => osimRuntime.value.backends.osidbAuth);

const shouldShowBanner = computed(() => {
  return isAccessTokenExpiringInOneHour.value && !isDismissed.value && authMethod.value === 'kerberos';
});

const timeRemainingText = computed(() => {
  const time = timeUntilExpiration.value;
  if (!time) return '';

  const hours = Math.floor(time.hours || 0);
  const minutes = Math.floor(time.minutes || 0);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
});

const bannerMessage = computed(() => {
  return `Your session will expire in ${timeRemainingText.value}. Click "Extend Session" to continue working.`;
});

const buttonText = computed(() => {
  return isReauthenticating.value ? 'Extending...' : 'Extend Session';
});

async function handleReauthenticate() {
  try {
    await reauthenticate();
    toastStore.addToast({
      title: 'Session Extended',
      body: 'Your session has been successfully extended.',
      css: 'success',
    });
    if (!isAccessTokenExpiringInOneHour.value) {
      isDismissed.value = false;
    }
  } catch (error) {
    toastStore.addToast({
      title: 'Session Extension Failed',
      body: 'Unable to extend your session. Please log in again.',
      css: 'danger',
    });
  }
}

function dismissBanner() {
  isDismissed.value = true;
}

watch(isAccessTokenExpiringInOneHour, (newValue: boolean) => {
  if (newValue) {
    isDismissed.value = false;
  }
});
</script>

<template>
  <Transition name="banner-slide">
    <div v-if="shouldShowBanner" class="session-warning-banner">
      <div class="container-fluid">
        <div class="alert alert-warning mb-0 d-flex align-items-center justify-content-between" role="alert">
          <div class="d-flex align-items-center">
            <i class="bi bi-exclamation-triangle-fill me-2"></i>
            <div>
              <strong>Session Expiring Soon</strong>
              <span class="ms-2">{{ bannerMessage }}</span>
            </div>
          </div>
          <div class="d-flex align-items-center gap-2">
            <button
              type="button"
              class="btn btn-warning btn-sm"
              :disabled="isReauthenticating"
              @click="handleReauthenticate"
            >
              <span
                v-if="isReauthenticating"
                class="spinner-border spinner-border-sm me-1"
                role="status"
              >
                <span class="visually-hidden">Loading...</span>
              </span>
              {{ buttonText }}
            </button>
            <button
              type="button"
              class="btn-close"
              :disabled="isReauthenticating"
              @click="dismissBanner"
            >
              <span class="visually-hidden">Close</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.session-warning-banner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1100;
  box-shadow: 0 2px 4px rgb(0 0 0 / 10%);
}

.banner-slide-enter-active,
.banner-slide-leave-active {
  transition: transform 0.3s ease-in-out;
}

.banner-slide-enter-from,
.banner-slide-leave-to {
  transform: translateY(-100%);
}

/* Add spacing to body when banner is shown */
:global(body:has(.session-warning-banner)) {
  padding-top: 60px;
}

/* Fallback for browsers that don't support :has() */
.session-warning-banner ~ * {
  margin-top: 60px;
}
</style>
