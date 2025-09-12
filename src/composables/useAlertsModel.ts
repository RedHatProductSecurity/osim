import { computed, type Ref } from 'vue';

import { groupBy, mergeDeepWith, prop, concat } from 'ramda';

import { type ZodFlawType } from '@/types/zodFlaw';
import { type ZodTrackerType, type ZodAffectCVSSType } from '@/types/zodAffect';
import { type ZodAlertType, ZodAlertSchema } from '@/types/zodShared';

function groupAlertsByType(alerts: ZodAlertType[]) {
  return mergeDeepWith(
    concat, groupBy(prop('alert_type'), alerts), { ERROR: [], WARNING: [] },
  );
}

function joinAlerts(modelsWithAlerts: any[]): ZodAlertType[] {
  return modelsWithAlerts.reduce((acc, obj) => acc.concat(obj.alerts), [] as ZodAlertType[]);
}

function joinGroupedAlerts(groupedAlerts: Record<string, ZodAlertType[]>[]) {
  return groupedAlerts.reduce((acc, obj) => mergeDeepWith(concat, acc, obj), { ERROR: [], WARNING: [] });
}

export function useAlertsModel(flaw: Ref<ZodFlawType>) {
  const baseFlawAlerts = computed(() => {
    return groupAlertsByType(flaw.value.alerts);
  });

  const flawCVSSAlerts = computed(() => {
    return groupAlertsByType(
      joinAlerts(flaw.value.cvss_scores).filter(Boolean),
    );
  });

  const flawAlerts = computed(() => {
    return joinGroupedAlerts(
      [
        baseFlawAlerts.value,
        flawCVSSAlerts.value,
      ].filter(Boolean),
    );
  });

  const flawAcknowledgmentsAlerts = computed(() => {
    return groupAlertsByType(
      joinAlerts(flaw.value.acknowledgments),
    );
  });

  const flawCommentsAlerts = computed(() => {
    return groupAlertsByType(
      joinAlerts(flaw.value.comments),
    );
  });

  const flawReferenceAlerts = computed(() => {
    return groupAlertsByType(
      joinAlerts(flaw.value.references),
    );
  });

  const baseAffectsAlerts = computed(() => {
    return groupAlertsByType(
      joinAlerts(flaw.value.affects),
    );
  });

  const affectsCVSSAlerts = computed(() => {
    const cvssScores = flaw.value.affects.reduce(
      (acc: ZodAffectCVSSType[], obj) => acc.concat(obj.cvss_scores), [] as ZodAffectCVSSType[],
    );
    return groupAlertsByType(joinAlerts(cvssScores));
  });

  const affectsAlerts = computed(() => {
    return joinGroupedAlerts(
      [
        baseAffectsAlerts.value,
        affectsCVSSAlerts.value,
      ],
    );
  });

  const trackersAlerts = computed(() => {
    const trackers = flaw.value.affects.reduce(
      (acc: ZodTrackerType[], obj) => acc.concat(obj.trackers), [] as ZodTrackerType[],
    );
    return groupAlertsByType(joinAlerts(trackers));
  });

  const alertsCount = computed(() => {
    return [
      flawAlerts.value,
      flawAcknowledgmentsAlerts.value,
      flawCommentsAlerts.value,
      flawReferenceAlerts.value,
      affectsAlerts.value,
      affectsCVSSAlerts.value,
      trackersAlerts.value,
    ].reduce(
      (acc: Record<string, number>, alertSet) => {
        for (const alertType in alertSet) {
          acc[alertType] += (alertSet as Record<string, ZodAlertType[]>)[alertType].length;
        }
        return acc;
      },
      Object.fromEntries(ZodAlertSchema.shape.alert_type.options.map(key => [key, 0])),
    );
  });

  return {
    alertsCount,
    flawAlerts,
    flawAcknowledgmentsAlerts,
    flawReferenceAlerts,
    flawCommentsAlerts,
    affectsAlerts,
    affectsCVSSAlerts,
    trackersAlerts,
  };
}
