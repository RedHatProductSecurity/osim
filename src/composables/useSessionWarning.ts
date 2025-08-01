import { computed, ref } from 'vue';

import jwtDecode from 'jwt-decode';
import type { JwtPayload } from 'jwt-decode';
import { DateTime } from 'luxon';

import { useUserStore } from '@/stores/UserStore';

export function useSessionWarning() {
  const userStore = useUserStore();
  const isReauthenticating = ref(false);

  const isRefreshTokenExpiringInOneHour = computed(() => {
    try {
      const refreshToken = userStore.refreshToken;
      if (!refreshToken) return false;

      const decoded = jwtDecode<JwtPayload>(refreshToken);
      const exp = decoded?.exp;

      if (!exp) return false;

      const expirationTime = DateTime.fromSeconds(exp);
      const oneHourFromNow = DateTime.now().plus({ hours: 1 });

      return expirationTime <= oneHourFromNow && expirationTime > DateTime.now();
    } catch (e) {
      return false;
    }
  });

  const timeUntilExpiration = computed(() => {
    try {
      const refreshToken = userStore.refreshToken;
      if (!refreshToken) return null;

      const decoded = jwtDecode<JwtPayload>(refreshToken);
      const exp = decoded?.exp;

      if (!exp) return null;

      const expirationTime = DateTime.fromSeconds(exp);
      const now = DateTime.now();

      if (expirationTime <= now) return null;

      return expirationTime.diff(now, ['hours', 'minutes']).toObject();
    } catch (e) {
      return null;
    }
  });

  async function reauthenticate() {
    if (isReauthenticating.value) return;

    try {
      isReauthenticating.value = true;
      await userStore.login();
    } catch (error) {
      userStore.logout();
      throw error;
    } finally {
      isReauthenticating.value = false;
    }
  }

  return {
    isAccessTokenExpiringInOneHour: isRefreshTokenExpiringInOneHour,
    timeUntilExpiration,
    isReauthenticating,
    reauthenticate,
  };
}
