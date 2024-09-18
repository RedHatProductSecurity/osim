<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';

import LabelCollapsible from '@/components/widgets/LabelCollapsible.vue';

import { type ZodAlertType } from '@/types/zodShared';

const props = defineProps<{
  alert: ZodAlertType;
}>();

const emit = defineEmits<{
  expandFocusedComponent: [value: string];
}>();

const isWarning = computed(() => {
  return props.alert?.alert_type === 'WARNING';
});

const isError = computed(() => {
  return props.alert?.alert_type === 'ERROR';
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

const isExpanded = ref(false);
</script>

<template>
  <div
    v-if="alert"
    class="alert my-1 p-2"
    :class="{'alert-warning': isWarning, 'alert-danger': isError}"
    role="alert"
  >
    <LabelCollapsible :isExpanded="isExpanded" @setExpanded="isExpanded = !isExpanded">
      <template #label>
        <span class="badge mx-2" :class="{'text-bg-warning': isWarning, 'text-bg-danger': isError}">
          <i class="bi" :class="{'bi-exclamation-triangle-fill': isWarning, 'bi-x-circle-fill': isError}" />
          {{ alert?.alert_type.charAt(0) + alert?.alert_type.slice(1).toLowerCase() + " " + alert?.name }}
        </span>
      </template>
      <div class="ms-1 py-2 container text-left">
        <div class="osim-flaw-alert-info">
          <strong>Description:</strong>
          <span>{{ ` ${alert.description}` }}</span>
        </div>
        <div class="osim-flaw-alert-info">
          <strong>How To Resolve:</strong>
          <span>{{ alert?.resolution_steps || " No resolution steps are defined." }}</span>
        </div>
        <div class="row mt-2">
          <div class="col">
            <button
              type="button"
              class="btn btn-sm btn-secondary"
              @click.prevent="scrollToComponent(alert?.parent_uuid)"
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

<style scoped lang="scss">
.osim-flaw-alert-info {
  strong,
  span {
    font-size: 14px;
  }
}
</style>
