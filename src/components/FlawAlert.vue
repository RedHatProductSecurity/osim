<script setup lang="ts">
import { type ZodAlertType } from '@/types/zodShared';
import LabelCollapsible from '@/components/widgets/LabelCollapsible.vue';
import { computed, nextTick } from 'vue';

const props = defineProps<{
  alert: ZodAlertType;
}>();

const emit = defineEmits<{
  'expandFocusedComponent': [value: string];
}>();

const isWarning = computed(() => {
  return props.alert.alert_type === 'WARNING';
});

const isError = computed(() => {
  return props.alert.alert_type === 'ERROR';
});

function scrollToComponent(parent_uuid: string) {
  emit('expandFocusedComponent', parent_uuid);
  nextTick(() => {
    const element = document.getElementById(parent_uuid);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
}


</script>

<template>
  <div class="alert my-1" :class="{'alert-warning': isWarning, 'alert-danger': isError}" role="alert">
    <LabelCollapsible>
      <template #label>
        <span class="badge mx-2" :class="{'text-bg-warning': isWarning, 'text-bg-danger': isError}">
          <i class="bi" :class="{'bi-exclamation-triangle-fill': isWarning, 'bi-x-circle-fill': isError}" />
          {{ alert.alert_type.charAt(0) + alert.alert_type.slice(1).toLowerCase() + " " + alert.name }}
        </span>
      </template>
      <div class="my-2 pt-1 px-2 container text-left">
        <div class="row">
          <strong>Description</strong>
        </div>
        <div class="row mx-auto mt-1">
          {{ alert.description }}
        </div>
        <div class="row mt-3">
          <strong>How To Resolve</strong>
        </div>
        <div class="row mx-auto mt-1">
          {{ alert.resolution_steps || "No resolution steps are defined." }}
        </div>
        <div class="row mt-3">
          <div class="col">
            <button
              type="button"
              class="btn btn-sm btn-secondary"
              @click.prevent="scrollToComponent(alert.parent_uuid)"
            >
              Scroll To Origin
              <i class="bi bi-arrow-down-circle"></i>
            </button>
          </div>
        </div>
      </div>
    </LabelCollapsible>
  </div>
</template>
