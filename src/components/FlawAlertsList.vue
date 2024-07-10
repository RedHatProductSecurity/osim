<script setup lang="ts">
import { ref, toRef, type Ref } from 'vue';
import { type ZodFlawType } from '@/types/zodFlaw';
import { useAlertsModel } from '@/composables/useAlertsModel';
import FlawAlertsSection from '@/components/FlawAlertsSection.vue';
import LabelCollapsible from './widgets/LabelCollapsible.vue';

const props = defineProps<{
  flaw: any;
}>();

const emit = defineEmits<{
  'expandFocusedComponent': [value: string];
}>();

const emitExpandFocusedComponent = (parent_uuid: string) => {
  emit('expandFocusedComponent', parent_uuid);
};

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
      <label class="mx-2 mb-0 form-label">
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
    <FlawAlertsSection
      :alertSet="flawAlerts"
      :sectionName="'Flaw'"
      @expandFocusedComponent="emitExpandFocusedComponent"
    />
    <FlawAlertsSection
      :alertSet="flawAcknowledgmentsAlerts"
      :sectionName="'Flaw Acknowledgments'"
      @expandFocusedComponent="emitExpandFocusedComponent"
    />
    <FlawAlertsSection
      :alertSet="flawReferenceAlerts"
      :sectionName="'Flaw References'"
      @expandFocusedComponent="emitExpandFocusedComponent"
    />
    <FlawAlertsSection
      :alertSet="flawCommentsAlerts"
      :sectionName="'Flaw Comments'"
      @expandFocusedComponent="emitExpandFocusedComponent"
    />
    <FlawAlertsSection
      :alertSet="affectsAlerts"
      :sectionName="'Affects'"
      @expandFocusedComponent="emitExpandFocusedComponent"
    />
    <FlawAlertsSection
      :alertSet="trackersAlerts"
      :sectionName="'Trackers'"
      @expandFocusedComponent="emitExpandFocusedComponent"
    />

  </LabelCollapsible>
</template>
