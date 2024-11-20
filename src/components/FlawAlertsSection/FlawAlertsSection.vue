<script setup lang="ts">
import { ref } from 'vue';

import FlawAlert from '@/components/FlawAlert/FlawAlert.vue';

import LabelCollapsible from '@/widgets/LabelCollapsible/LabelCollapsible.vue';
import { type ZodAlertType } from '@/types/zodShared';

const props = defineProps<{
  alertSet: Record<string, ZodAlertType[]>;
  sectionName: string;
}>();

const emit = defineEmits<{
  expandFocusedComponent: [value: string];
}>();

const isExpanded = ref(false);

const emitExpandFocusedComponent = (parent_uuid: string) => {
  emit('expandFocusedComponent', parent_uuid);
};
</script>

<template>
  <LabelCollapsible
    v-if="Object.values(alertSet).reduce((acc, alertType) => acc + alertType.length, 0) !== 0"
    :isExpanded="isExpanded"
    @toggleExpanded="isExpanded = !isExpanded"
  >
    <template #label>
      <span>
        <label class="mx-2">
          {{ props.sectionName + ":" }}
        </label>
        <span v-if="!isExpanded">
          <span v-if="alertSet['ERROR'].length" class="badge text-bg-danger mx-1">
            <i class="bi bi-x-circle-fill" />
            {{ alertSet['ERROR'].length }} Errors
          </span>
          <span v-if="alertSet['WARNING'].length" class="badge text-bg-warning mx-1">
            <i class="bi bi-exclamation-triangle-fill" />
            {{ alertSet['WARNING'].length }} Warnings
          </span>
        </span>
      </span>
    </template>

    <div v-for="alerts,alertType in alertSet" :key="alertType">
      <div v-if="alerts.length">
        <span v-for="(alert, index) in alerts" :key="alert?.uuid || `alert-${index}-${alertType}`">
          <FlawAlert :alert="alert" @expandFocusedComponent="emitExpandFocusedComponent" />
        </span>
      </div>
    </div>
  </LabelCollapsible>
</template>
