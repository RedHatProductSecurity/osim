<script setup lang="ts">
import { ref, toRef, type Ref } from 'vue';
import { type ZodFlawType } from '@/types/zodFlaw';
import { useAlertsModel } from '@/composables/useAlertsModel';
import FlawAlertsSection from '@/components/FlawAlertsSection.vue';
import LabelCollapsible from './widgets/LabelCollapsible.vue';

const props = defineProps<{
  flaw: any;
}>();

const flaw: Ref<ZodFlawType> = toRef(props, 'flaw');

const {
  alertsCount,
  flawAlerts,
  flawAcknowledgmentsAlerts,
  flawCommentsAlerts,
  flawReferenceAlerts,
  affectsAlerts,
  trackersAlerts,
} = useAlertsModel(flaw);

const alertsExpanded = ref(false);

</script>

<template>
  <LabelCollapsible
    v-if="Object.values(alertsCount).reduce((acc, alertTypeCount) => acc + alertTypeCount, 0) !== 0"
    class="my-2"
    :isExpanded="alertsExpanded"
    @setExpanded="alertsExpanded = !alertsExpanded"
  >
    <template #label>
      <label class="mx-2 form-label">
        Alerts:
      </label>
      <span v-if="!alertsExpanded">
        <div v-if="alertsCount['ERROR']" class="badge text-bg-danger mx-1">
          <i class="bi bi-x-circle-fill" />
          {{ alertsCount['ERROR'] }} Errors
        </div>
        <div v-if="alertsCount['WARNING']" class="badge text-bg-warning mx-1">
          <i class="bi bi-exclamation-triangle-fill" />
          {{ alertsCount['WARNING'] }} Warnings
        </div>
      </span>
    </template>
    <FlawAlertsSection :alertSet="flawAlerts" :sectionName="'Flaw'" />
    <FlawAlertsSection :alertSet="flawAcknowledgmentsAlerts" :sectionName="'Flaw Acknowledgments'" />
    <FlawAlertsSection :alertSet="flawReferenceAlerts" :sectionName="'Flaw References'" />
    <FlawAlertsSection :alertSet="flawCommentsAlerts" :sectionName="'Flaw Comments'" />
    <FlawAlertsSection :alertSet="affectsAlerts" :sectionName="'Affects'" />
    <FlawAlertsSection :alertSet="trackersAlerts" :sectionName="'Trackers'" />

  </LabelCollapsible>
</template>
